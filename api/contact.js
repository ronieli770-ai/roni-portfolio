/* Takes a submission from the contact form and mails it on through Resend.
   The API key never reaches the browser - it lives in the project's
   environment variables and is read here, on Vercel's side. */

const TO   = process.env.CONTACT_TO   || 'ronieli770@gmail.com';
const FROM = process.env.CONTACT_FROM || 'onboarding@resend.dev';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    /* temporary aid while wiring the key up: names only, never any value */
    const seen = Object.keys(process.env).filter(k => /resend|api_key/i.test(k));
    return res.status(500).json({ error: 'missing_api_key', lookalikeNames: seen });
  }

  const b = req.body || {};
  const name  = String(b.name  || '').trim();
  const phone = String(b.phone || '').trim();
  if (!name || !phone) return res.status(400).json({ error: 'name_and_phone_required' });

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#111">
      <h2 style="margin:0 0 4px">פנייה חדשה מהאתר</h2>
      <p style="margin:0 0 18px;color:#666;font-size:14px">ronieliyahu.co.il</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px;font-size:15px">
        ${row('שם מלא', name)}
        ${row('טלפון', phone)}
        ${row('שם העסק או אתר קיים', b.business)}
        ${row('תחום העסק', b.field)}
        ${row('יעד האתר', b.goal)}
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
      /* shape only, never the key: enough to tell a truncated paste from a
         wrong key, without putting secret material in the logs */
      console.error('resend rejected the message:', r.status, await r.text(),
        '| key shape:', JSON.stringify({
          length: key.length,
          prefix: key.slice(0, 3),
          hasWhitespace: /\s/.test(key),
          hasQuotes: /["']/.test(key),
        }));
      return res.status(502).json({ error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('could not reach resend:', err);
    return res.status(502).json({ error: 'send_failed' });
  }
}
