/* Takes a submission from the contact form, files it in the database and
   mails it on through Resend. Both keys live in the project's environment
   variables and are read here, on Vercel's side, never in the browser. */

const TO = process.env.CONTACT_TO || 'ronieli770@gmail.com';
/* the domain's own address is waiting on the registrar to publish the
   verification records, so until then the mail goes out on Resend's */
const FROM = process.env.CONTACT_FROM || 'onboarding@resend.dev';

const DB_URL = process.env.SUPABASE_URL || 'https://mgnvvtevbzepxnbkekpv.supabase.co';

/* the values land inside an html mail, so they are escaped rather than trusted */
const esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const row = (label, value) => value
  ? `<tr>
       <td style="padding:10px 14px;border-bottom:1px solid #eee;background:#fafafa;
                  font-weight:600;white-space:nowrap">${esc(label)}</td>
       <td style="padding:10px 14px;border-bottom:1px solid #eee">${esc(value)}</td>
     </tr>`
  : '';

/* Files the lead away first, because a mail that fails can be resent from the
   admin page, while a lead that was never stored is simply gone. */
async function store(lead) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error('no supabase key, the lead was not stored'); return false; }

  const r = await fetch(`${DB_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(lead),
  });

  if (!r.ok) { console.error('the database refused the lead:', r.status, await r.text()); return false; }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'missing_api_key' });

  const b = req.body || {};
  const name  = String(b.name  || '').trim();
  const phone = String(b.phone || '').trim();
  if (!name || !phone) return res.status(400).json({ error: 'name_and_phone_required' });

  const lead = {
    name,
    phone,
    business: String(b.business || '').trim() || null,
    field:    String(b.field    || '').trim() || null,
    goal:     String(b.goal     || '').trim() || null,
  };

  let stored = false;
  try { stored = await store(lead); }
  catch (err) { console.error('could not reach the database:', err); }

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#111">
      <h2 style="margin:0 0 4px">פנייה חדשה מהאתר</h2>
      <p style="margin:0 0 18px;color:#666;font-size:14px">ronieliyahu.co.il</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px;font-size:15px">
        ${row('שם מלא', name)}
        ${row('טלפון', phone)}
        ${row('שם העסק או אתר קיים', lead.business)}
        ${row('תחום העסק', lead.field)}
        ${row('יעד האתר', lead.goal)}
      </table>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `טופס האתר <${FROM}>`,
        to: [TO],
        subject: `פנייה חדשה מהאתר - ${name}`,
        html,
      }),
    });

    if (!r.ok) {
      /* the reason is kept in the function's logs; the browser is told only
         that it failed, so nothing about the account leaks into the page */
      console.error('resend rejected the message:', r.status, await r.text());
      /* a stored lead is not a lost one, so the visitor still gets a yes */
      return stored ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('could not reach resend:', err);
    return stored ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'send_failed' });
  }
}
