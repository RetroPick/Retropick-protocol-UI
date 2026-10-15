import { useState } from 'react';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import type { Address } from 'viem';
import { tokenAbi } from '@retropick/launchpad-sdk/abis/tokenAbi';
import { watchAsset } from '@retropick/launchpad-sdk/wallet';
import { publicClient } from '@/lib/live/public-client';
import { useWallet } from '@/wallet/provider';
import { classifyWatchAssetError, httpsImageUrl, watchAssetAction } from './add-to-wallet';

/**
 * Add-to-Wallet (EIP-747 wallet_watchAsset) for live launch tokens. The wallet prompt fires
 * only from this click — nothing requests wallet attention during page load. A resolved
 * request means the wallet accepted the registration; it does NOT prove the artwork
 * re-rendered (already-imported tokens keep their old image), so the success toast says so.
 */
export function AddToWalletButton({ token, symbol, logo, decimals }: { token: Address; symbol: string; logo: string | null; decimals: number | null }) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const disabled = busy || !symbol || !/^0x[\da-fA-F]{40}$/.test(token);

  const request = async () => {
    const provider = wallet.provider;
    if (!provider) throw Error('No wallet provider is connected.');
    // Decimals come from the identity read or a direct contract read at click time — never assumed.
    const resolved = decimals ?? Number(await publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'decimals' }));
    if (!Number.isInteger(resolved) || resolved < 0 || resolved > 255) throw Error('Token decimals are unavailable.');
    const added = await watchAsset(provider, { address: token, symbol, decimals: resolved, image: httpsImageUrl(logo) });
    if (added) {
      toast.success(`${symbol} submitted to your wallet`, { description: 'If the artwork still shows a letter icon, remove the token and add it again so the wallet re-reads its image.' });
    } else {
      toast.warning(`${symbol} was not added to the wallet.`);
    }
  };

  const onClick = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      const action = watchAssetAction(wallet.status);
      if (action === 'connect') {
        await wallet.connect();
        toast.message('Wallet connected', { description: 'Press Add to Wallet again to register the token.' });
        return;
      }
      if (action === 'switch-chain') {
        await wallet.switchChain();
        toast.message('Switch requested', { description: 'Once your wallet is on Monad Testnet, press Add to Wallet.' });
        return;
      }
      await request();
    } catch (error) {
      const kind = classifyWatchAssetError(error);
      if (kind === 'rejected') toast.error('Request rejected in wallet.');
      else if (kind === 'unsupported') toast.warning('This wallet cannot register tokens.', { action: { label: 'Copy token address', onClick: () => { void navigator.clipboard?.writeText(token); } } });
      else if (kind === 'wrong-chain') toast.error('Switch your wallet to Monad Testnet first.');
      else toast.error(error instanceof Error ? error.message : 'Add to Wallet failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" data-testid="add-to-wallet" disabled={disabled} onClick={() => void onClick()}>
      <Wallet size={12} aria-hidden/> Add to Wallet
    </button>
  );
}
