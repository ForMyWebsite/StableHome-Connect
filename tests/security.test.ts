import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));
import { siteOrigin, assertSameOrigin } from '../lib/security';
afterEach(() => vi.unstubAllEnvs());
describe('origin checks behind a local Next.js listener', () => {
  it('uses the recognized loopback host for localhost requests', () => {
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('CODESPACE_NAME', '');
    const request = new Request('http://0.0.0.0:3000/api/demo', {
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
    });
    expect(siteOrigin(request)).toBe('http://localhost:3000');
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
  it('rejects foreign origin submissions and untrusted forwarded hosts', () => {
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('CODESPACE_NAME', '');
    const request = new Request('http://0.0.0.0:3000/api/demo', {
      headers: {
        host: 'localhost:3000',
        origin: 'https://attacker.example',
        'x-forwarded-host': 'attacker.example',
      },
    });
    expect(() => assertSameOrigin(request)).toThrow();
  });
  it('uses the configured public origin for Codespaces callbacks', () => {
    vi.stubEnv('SITE_URL', 'https://example-3000.app.github.dev');
    expect(siteOrigin(new Request('http://0.0.0.0:3000/api/auth'))).toBe(
      'https://example-3000.app.github.dev',
    );
  });
});

describe('browser Fetch Metadata behind HTTPS forwarding', () => {
  it('accepts browser-confirmed same-origin posts when the proxy rewrites the origin', () => {
    vi.stubEnv('SITE_URL', 'https://example-3000.app.github.dev');
    const req = new Request('http://localhost:3000/api/auth', {
      headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' },
    });
    expect(() => assertSameOrigin(req)).not.toThrow();
  });
  it.each(['cross-site', 'same-site'])('rejects %s requests from another origin', (fetchSite) => {
    vi.stubEnv('SITE_URL', 'https://example-3000.app.github.dev');
    const req = new Request('http://localhost:3000/api/auth', {
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': fetchSite },
    });
    expect(() => assertSameOrigin(req)).toThrow();
  });
  it('rejects missing and opaque origins even with a same-origin metadata value', () => {
    for (const origin of ['', 'null'])
      expect(() =>
        assertSameOrigin(
          new Request('http://localhost:3000/api/auth', {
            headers: { origin, 'sec-fetch-site': 'same-origin' },
          }),
        ),
      ).toThrow();
  });
});
