/* The admin page's door to the leads. Everything here needs Roni's password,
   which lives only in the project's environment as ADMIN_PASSWORD. A right
   password gets a signed cookie for 30 days; the cookie is checked on every
   call and can't be read by scripts in the page. */

import crypto from 'node:crypto';
import { ready, allLeads, getLead, putLead, dropLead } from './_store.js';

const DAYS = 30;
const STATUSES = ['new', 'talking', 'call', 'offer', 'won', 'lost'];

const secret = () => crypto.createHash('sha256').update('roni-admin|' + (process.env.ADMIN_PASSWORD || '')).digest();
const sign = s => crypto.createHmac('sha256', secret()).update(s).digest('base64url');

function makeToken() {
  const exp = String(Date.now() + DAYS * 864e5);
  return exp + '.' + sign(exp);
}

function validToken(t) {
  if (!t || !process.env.ADMIN_PASSWORD) return false;
  const [exp, mac] = String(t).split('.');
  if (!exp || !mac || +exp < Date.now()) return false;
  const want = Buffer.from(sign(exp)), got = Buffer.from(mac);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

const cookieOf = req => {
  const m = String(req.headers.cookie || '').match(/(?:^|;\s*)ra=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

const setCookie = (res, value, maxAge) => res.setHeader('Set-Cookie',
  `ra=${value}; Path=/api/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`);

/* only the fields the page is allowed to change, each in its own shape */
function clean(patch) {
  const out = {};
  if ('status' in patch && STATUSES.includes(patch.status)) out.status = patch.status;
  if ('follow_up' in patch) out.follow_up = /^\d{4}-\d{2}-\d{2}$/.test(patch.follow_up || '') ? patch.follow_up : null;
  if ('value' in patch) { const n = Number(String(patch.value).replace(/[^\d.]/g, '')); out.value = n > 0 ? Math.round(n) : null; }
  for (const k of ['name', 'phone', 'business', 'goal']) {
    if (k in patch) out[k] = String(patch[k] || '').trim().slice(0, 500) || null;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const b = req.body || {};

  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'no_admin_password' });

  if (req.method === 'POST' && b.action === 'login') {
    const want = Buffer.from(crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex'));
    const got = Buffer.from(crypto.createHash('sha256').update(String(b.password || '')).digest('hex'));
    if (!crypto.timingSafeEqual(want, got)) {
      await new Promise(r => setTimeout(r, 800)); /* a slow no makes guessing tedious */
      return res.status(401).json({ error: 'wrong_password' });
    }
    setCookie(res, makeToken(), DAYS * 86400);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST' && b.action === 'logout') {
    setCookie(res, '', 0);
    return res.status(200).json({ ok: true });
  }

  if (!validToken(cookieOf(req))) return res.status(401).json({ error: 'signed_out' });
  if (!ready()) return res.status(503).json({ error: 'no_database' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ leads: await allLeads() });
    }

    if (req.method === 'POST' && b.action === 'update') {
      const lead = await getLead(String(b.id || ''));
      if (!lead) return res.status(404).json({ error: 'not_found' });
      Object.assign(lead, clean(b.patch || {}));
      lead.updated_at = new Date().toISOString();
      return res.status(200).json({ lead: await putLead(lead) });
    }

    if (req.method === 'POST' && b.action === 'note') {
      const lead = await getLead(String(b.id || ''));
      const text = String(b.text || '').trim().slice(0, 2000);
      if (!lead) return res.status(404).json({ error: 'not_found' });
      if (!text) return res.status(400).json({ error: 'empty_note' });
      lead.notes = Array.isArray(lead.notes) ? lead.notes : [];
      lead.notes.push({ t: new Date().toISOString(), text });
      lead.updated_at = new Date().toISOString();
      return res.status(200).json({ lead: await putLead(lead) });
    }

    if (req.method === 'POST' && b.action === 'delete') {
      await dropLead(String(b.id || ''));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('admin:', err);
    return res.status(502).json({ error: 'database_failed' });
  }
}
