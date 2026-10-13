/** Resolve same-origin reads at runtime so a domain cutover needs no rebuild. */
export function indexerOrigin(configured: string, browserOrigin: string): string {
  return configured === 'same-origin' ? browserOrigin : configured.replace(/\/$/, '');
}
