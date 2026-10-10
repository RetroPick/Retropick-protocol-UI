import { test, expect, expectClean, EVIDENCE_DIR } from '../helpers/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({ wallet: false });
const required = ['detail:essential', 'detail:economic', 'detail:trade-interactive'];
for (const phase of ['ACTIVE', 'GRADUATED'] as const) {
  test(`@resume-hydration ${phase} RPC economic hydration independently qualifies the indexed shell`, async ({ page, observed, snap }, info) => {
    test.setTimeout(120000);
    let launch: { token: string } | undefined;
    try {
      const response = await fetch(`${process.env.LIVE_INDEXER_URL ?? 'http://127.0.0.1:8787'}/v1/launches?limit=20`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) { test.skip(true, `ENVIRONMENT: indexer HTTP ${response.status}`); return; }
      const body = await response.json();
      launch = body.data.find((entry: { phase: string }) => entry.phase === phase);
    } catch { test.skip(true, 'ENVIRONMENT: indexer unreachable'); return; }
    test.skip(!launch, `ENVIRONMENT: no indexed ${phase} launch`);
    let shellReady = false;
    let ticketReady = false;
    try {
      await page.goto(`/launchpad/token/${launch!.token}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('token-terminal')).toHaveAttribute('data-lifecycle', phase);
      shellReady = true;
      await expect.poll(async () => page.evaluate((stages) => stages.map(stage => (window.__retroPerformance ?? []).some(record => record.stage === stage)), required), {
        timeout:75000, intervals:[500,1000,2000], message:'RPC essential/economic reads and interactive ticket must complete independently of indexed fallback',
      }).toEqual([true,true,true]);
      const ticket = page.getByTestId('trade-ticket');
      await expect(ticket).toBeVisible();
      if (phase === 'ACTIVE') {
        await expect(ticket).not.toContainText('Syncing on-chain state');
        await expect(ticket).toContainText(/Fees: [\d.]+% curve \+ [\d.]+% creator/);
      } else {
        await expect(ticket).toContainText('Kuru orderbook');
        // A local limit preview is available only after RPC market identity
        // qualification supplies exact parameters. Filling it requests no write.
        await ticket.getByRole('radiogroup', { name:'Order type' }).getByRole('radio', { name:'Limit' }).click();
        await page.getByTestId('ticket-limit-price').fill('0.004');
        await page.getByTestId('ticket-amount').fill('1');
        await expect(page.getByTestId('ticket-total')).not.toHaveText('—');
        await expect(ticket).toContainText('Normalized to market tick');
      }
      ticketReady = true;
      await snap(`hydrated-${phase.toLowerCase()}`);
      expectClean(observed);
    } finally {
      const records = await page.evaluate(() => window.__retroPerformance ?? []).catch(() => []);
      const report = { phase, wallet:'absent; no wallet account or economic write requested', shellReady, ticketReady, boundMs:75000,
        stages:required.map(stage=>({stage,result:records.some(record=>record.stage===stage)?'PASS':'FAIL'})),
        records:records.filter(record=>required.includes(record.stage)) };
      mkdirSync(EVIDENCE_DIR,{recursive:true});
      writeFileSync(join(EVIDENCE_DIR,`hydration-${phase.toLowerCase()}.json`),JSON.stringify(report,null,2));
      await info.attach('RPC-hydration',{body:JSON.stringify(report,null,2),contentType:'application/json'});
    }
  });
}
