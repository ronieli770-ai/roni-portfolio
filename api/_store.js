/* The leads live in a small Redis database (Upstash, connected to this Vercel
   project from its Storage tab). Vercel puts the address and key into the
   project's environment; both names it uses are accepted here. Files in /api
   that start with "_" are helpers, not pages of their own. */

const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const ready = () => !!(URL_() && TOKEN());

/* one command over Upstash's REST door: ["HSET","leads",id,json] */
async function cmd(args) {
  const r = await fetch(URL_(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error('redis: ' + (data.error || r.status));
  return data.result;
}

const KEY = 'leads';

export async function allLeads() {
  const flat = (await cmd(['HGETALL', KEY])) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push(JSON.parse(flat[i + 1])); } catch (e) { /* a broken row is skipped, never fatal */ }
  }
  return out.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function getLead(id) {
  const v = await cmd(['HGET', KEY, id]);
  return v ? JSON.parse(v) : null;
}

export async function putLead(lead) {
  await cmd(['HSET', KEY, lead.id, JSON.stringify(lead)]);
  return lead;
}

export async function dropLead(id) {
  await cmd(['HDEL', KEY, id]);
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
