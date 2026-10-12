#!/usr/bin/env node
// Real read-only qualification; never simulates a funded financial action or broadcasts.
import { createChain, errorText } from '../../packages/launchpad-sdk/src/chain.ts';
import { readLaunchEssential, readLaunchEconomic } from '../../packages/launchpad-sdk/src/model.ts';
import { assertKuruMarketIdentity } from '../../packages/launchpad-sdk/src/prepare.ts';
import { readKuruBook } from '../../packages/launchpad-sdk/src/kuru.ts';
const token = '0x30ccb65006665022dfc97bb5c1985610503fd1cf';
for (const url of ['https://testnet-rpc.monad.xyz', 'https://rpc.ankr.com/monad_testnet']) {
  const chain = createChain(url, {timeoutMs:8000,maxConcurrent:4,requestsPerSecond:10});
  try {
    await chain.probeProviders();
    const essential = await readLaunchEssential(chain,token);
    const economic = await readLaunchEconomic(chain,essential);
    const market = await assertKuruMarketIdentity(chain,essential.receipt.market,token);
    const book = await readKuruBook(chain,essential.receipt.market);
    console.log(JSON.stringify({fixture:false,at:new Date().toISOString(),origin:new URL(url).host,chainId:await chain.getChainId(),token,market:essential.receipt.market,block:essential.blockNumber.toString(),phase:essential.ledger.phase,feeBps:economic.fee.toString(),baseDecimals:market.baseDecimals.toString(),quoteDecimals:market.quoteDecimals.toString(),bookBlock:book.block.toString(),bids:book.bids.length,asks:book.asks.length,providers:chain.rpcHealth(),result:'passed'}));
  } catch(error) {console.log(JSON.stringify({fixture:false,at:new Date().toISOString(),origin:new URL(url).host,result:'failed',error:errorText(error),providers:chain.rpcHealth()}));process.exitCode=1;}
}
