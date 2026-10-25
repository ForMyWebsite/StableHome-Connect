import 'server-only';
import type { NextRequest } from 'next/server';
export function siteOrigin(request: Request) {
  const configured =
    process.env.SITE_URL ||
    (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
      ? `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : undefined);
  if (configured) return new URL(configured).origin;
  const localHost = request.headers.get('host');
  if (localHost && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d{1,5})?$/.test(localHost))
    return `${new URL(request.url).protocol}//${localHost}`;
  return new URL(request.url).origin;
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  // Browsers control this forbidden header. A forwarding proxy may rewrite Origin,
  // but cannot turn a cross-site browser request into a same-origin browser fetch.
  if (origin && origin !== 'null' && fetchSite === 'same-origin') return;
  const expected = siteOrigin(request);
  if (!origin || origin === 'null' || fetchSite === 'cross-site' || origin !== expected)
    throw new Error(
      `Please submit from ${expected}. Received origin: ${origin || 'missing'}. Check SITE_URL and restart the app.`,
    );
}
// Single-instance guard for local/Codespaces use. Supabase also enforces Auth limits.
// ponytail: counters are process-local; use a shared store before horizontal deployment.
const limits = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max = 40, windowMs = 60_000) {
  const now = Date.now();
  if (limits.size > 10000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  let row = limits.get(key);
  if (!row || row.until < now) {
    row = { count: 0, until: now + windowMs };
    limits.set(key, row);
  }
  if (++row.count > max) throw new Error('Too many requests. Please wait a minute and try again.');
}
export async function readJson(request: NextRequest) {
  if (Number(request.headers.get('content-length')) > 65536)
    throw new Error('Request is too large.');
  const text = await request.text();
  if (text.length > 65536) throw new Error('Request is too large.');
  return JSON.parse(text);
}
export function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (
    /Too many|Please submit|too large|configured|invitation|Invitation|must|not authorized|Not authorized|closed|latest proposal|Sign in with|Only tenants|Check the|Enter a|Choose a/i.test(
      message,
    )
  )
    return message.slice(0, 200);
  return 'We could not complete that request. Check your connection and try again. If this is a new setup, apply the Supabase migrations first.';
}
