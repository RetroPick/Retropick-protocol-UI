import type { Page, Request } from '@playwright/test';

/**
 * Network guard: blocks and records any request that could broadcast or sign a transaction, and (fixture target)
 * any outbound request that is not the local app server or the font CDN. Tests assert `violations` is empty.
 */
const WRITE_METHODS = /"method"\s*:\s*"(eth_send\w*|eth_sign\w*|personal_sign|wallet_send\w*|wallet_sign\w*)"/;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

export interface GuardRecord { url: string; method: string; reason: string }
export interface NetworkGuard { violations: GuardRecord[]; blockedExternal: GuardRecord[]; requests: GuardRecord[] }

export async function installNetworkGuard(page: Page, mode: 'fixture' | 'live' | 'research'): Promise<NetworkGuard> {
  const guard: NetworkGuard = { violations: [], blockedExternal: [], requests: [] };
  await page.route('**/*', async (route) => {
    const req: Request = route.request();
    const url = new URL(req.url());
    const body = req.postData() ?? '';
    guard.requests.push({ url: redactUrl(req.url()), method: req.method(), reason: req.resourceType() });
    if (WRITE_METHODS.test(body)) {
      guard.violations.push({ url: redactUrl(req.url()), method: req.method(), reason: 'signing/broadcast JSON-RPC method' });
      return route.abort('blockedbyclient');
    }
    if (mode === 'fixture') {
      const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:';
      if (!local && !FONT_HOSTS.includes(url.hostname)) {
        guard.blockedExternal.push({ url: redactUrl(req.url()), method: req.method(), reason: 'fixture target is offline-only' });
        return route.abort('blockedbyclient');
      }
    }
    if (mode !== 'fixture' && req.method() !== 'GET' && req.method() !== 'HEAD' && req.method() !== 'OPTIONS') {
      // Live/research: POST is permitted only for read-only JSON-RPC (checked above) and analytics beacons are dropped.
      if (!body.includes('"jsonrpc"')) {
        guard.blockedExternal.push({ url: redactUrl(req.url()), method: req.method(), reason: 'non-RPC write request blocked' });
        return route.abort('blockedbyclient');
      }
    }
    return route.continue();
  });
  return guard;
}

export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.username = '';
    u.password = '';
    for (const key of [...u.searchParams.keys()]) if (/key|token|secret|auth|sig/i.test(key)) u.searchParams.set(key, 'REDACTED');
    // API keys embedded in RPC paths (e.g. /v2/<key>)
    u.pathname = u.pathname.replace(/\/[A-Za-z0-9_-]{24,}(?=\/|$)/g, '/REDACTED');
    return u.toString();
  } catch { return raw; }
}
