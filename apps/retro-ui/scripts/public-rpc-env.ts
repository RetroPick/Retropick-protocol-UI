/** Browser RPC URLs must be public-safe. Private Infura reads require a server gateway. */
export function assertPublicRpcEnv(env: Record<string, string | undefined>): void {
  for (const name of ['VITE_MONAD_RPC_URL', 'VITE_MONAD_RPC_FALLBACK_URL']) {
    const value = env[name];
    if (!value) continue;
    let url: URL;
    try { url = new URL(value, 'http://localhost'); }
    catch { throw new Error(`${name} must be a public-safe RPC URL`); }
    const privateHost = /(^|\.)infura\.io$/i.test(url.hostname);
    const sensitiveQuery = [...url.searchParams.keys()].some(key => /key|token|secret|auth|credential/i.test(key));
    const credentialPath = url.pathname.split('/').some(part => /^[a-f\d]{24,}$/i.test(part));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || privateHost || sensitiveQuery || credentialPath) {
      // Never include URL/value/nested provider errors in a thrown diagnostic.
      throw new Error(`${name} cannot embed RPC credentials; configure a public-safe endpoint or server-side read-only gateway`);
    }
  }
}
