'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiShieldCheckLine } from 'react-icons/ri';
import { isAddress, zeroAddress, type Address } from 'viem';
import { AddressChip, ErrorState } from '@/components/trading/primitives';
import { useWallet } from '@/wallet/provider';
import { PROTECTION_MODES, type ProtectionMode } from '@/lib/mera-signer/protection';
import { enrollSigner, loadEnrollments, persistEnrollment, recoveryOptions, type Enrollment } from '@/lib/mera-signer/enrollment';
import { deriveSignerIdentity } from '@/lib/mera-signer/signer';
import { confirmWithPasskey, selectedConfirmation, setAppConfirmation, transactionHash, type PreparedAction } from '@/lib/mera-signer/authorization';
import { prepareTransferCreatorFeeRecipient, prepareFeeClaim, prepareFeeClaimToken, prepareBuybackRelease, prepareMarginWithdraw } from '@retropick/launchpad-sdk/prepare';
import { prepareTransfer } from '@retropick/launchpad-sdk/transfer';
import { parseExact } from '@retropick/launchpad-sdk/math';
import { addresses, release } from '@retropick/launchpad-sdk/chain';
import { factoryAbi } from '@retropick/launchpad-sdk/abis/factoryAbi';
import { tokenAbi } from '@retropick/launchpad-sdk/abis/tokenAbi';
import { marginAbi } from '@retropick/launchpad-sdk/abis/marginAbi';
import { retroPickFeeEscrowV2Abi } from '@retropick/launchpad-sdk/abis/retroPickFeeEscrowV2Abi';
import { launchKeys } from '@/lib/live/queries';
import { publicClient } from '@/lib/live/public-client';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { executeProtectedAction } from '@/services/protected-execution';
import { fetchWalletState } from '@/services/wallet-state';
import { useCreatedLaunches } from '@/hooks/use-created-launches';
import { exactAmount } from '@/lib/live/format';
import { toast } from 'sonner';

type Review = { kind: 'handoff' | 'protected'; prepared: PreparedAction; prepare: () => Promise<PreparedAction>; context: string };
export function ProtectedEarn() {
  const wallet = useWallet(), account = wallet.account;
  const [enrollments, setEnrollments] = useState<Enrollment[]>(loadEnrollments);
  const [credential, setCredential] = useState('');
  const signer = enrollments.find(entry => entry.credentialId === credential) ?? null;
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [mode, setMode] = useState<ProtectionMode>('NONE');
  const [token, setToken] = useState(''), [asset, setAsset] = useState<string>(zeroAddress), [amount, setAmount] = useState(''), [destination, setDestination] = useState('');
  const [review, setReview] = useState<Review | null>(null), [tx, setTx] = useState<TxPhase | null>(null);
  const context = `${account}:${wallet.chainId}:${credential}:${token}:${asset}:${amount}:${destination}`;
  const currentContext = useRef(context); currentContext.current = context;
  useEffect(() => { setReview(null); setTx(null); setError(''); }, [context]);
  useEffect(() => {
    try { setMode(account && selectedConfirmation(account) ? 'APP_ONLY' : 'NONE'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Passkey preference unavailable.'); setMode('APP_ONLY'); }
  }, [account]);
  const created = useCreatedLaunches(account);
  const rights = useQuery({ queryKey: ['launchpad', 10143, 'recipient-rights', token.toLowerCase()], enabled: isAddress(token), staleTime: 5000, queryFn: async () => {
    const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
    const [launch, pending, block] = await Promise.all([
      publicClient.readContract({ address: addresses.factory, abi: factoryAbi, functionName: 'getLaunchedToken', args: [token as Address], blockNumber }),
      publicClient.readContract({ address: addresses.factory, abi: factoryAbi, functionName: 'pendingCreatorFeeRecipient', args: [token as Address], blockNumber }),
      publicClient.getBlock({ blockNumber }),
    ]);
    return { launch, blockNumber, pending: pending[0] !== zeroAddress && pending[2] >= block.timestamp };
  } });
  const originalState = useQuery({ queryKey: launchKeys.wallet(account ?? 'disconnected', 'state'), enabled: !!account, queryFn: ({ signal }) => fetchWalletState(account!, signal), refetchInterval: 15000, staleTime: 10000 });
  const protectedState = useQuery({ queryKey: ['launchpad', 10143, 'protected-state', signer?.address], enabled: !!signer, queryFn: ({ signal }) => fetchWalletState(signer!.address, signal), refetchInterval: 15000, staleTime: 10000 });
  const protectedAsset = useQuery({ queryKey: ['launchpad', 10143, 'protected-asset', signer?.address, asset.toLowerCase()], enabled: !!signer && isAddress(asset) && asset !== zeroAddress, queryFn: async () => {
    const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
    const [balance, credit, margin, decimals] = await Promise.all([
      publicClient.readContract({ address: asset as Address, abi: tokenAbi, functionName: 'balanceOf', args: [signer!.address], blockNumber }),
      publicClient.readContract({ address: addresses.feeEscrow, abi: retroPickFeeEscrowV2Abi, functionName: 'balanceOfToken', args: [signer!.address, asset as Address], blockNumber }),
      publicClient.readContract({ address: release.kuruEnvironment.marginAccount as Address, abi: marginAbi, functionName: 'getBalance', args: [signer!.address, asset as Address], blockNumber }),
      publicClient.readContract({ address: asset as Address, abi: tokenAbi, functionName: 'decimals', blockNumber }),
    ]);
    return { balance, credit, margin, decimals: Number(decimals), blockNumber };
  }, staleTime: 10000, refetchInterval: 15000 });
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Passkey action failed.'); } finally { setBusy(false); } };
  const enroll = (kind: 'create' | 'reuse') => run(async () => {
    if (!consent || !account) throw Error('Connect a creator wallet and consent to storing public registration metadata first.');
    const entry = await enrollSigner(kind, account);
    if (currentContext.current !== context) throw Error('Wallet context changed during enrollment. Retry.');
    persistEnrollment(entry); setEnrollments(loadEnrollments()); setCredential(entry.credentialId);
    toast.success('Protected wallet registered');
  });
  const recover = () => run(async () => {
    if (!signer) throw Error('Select a registered passkey first.');
    await deriveSignerIdentity(recoveryOptions(signer));
    toast.success('Registered address recovered with this passkey');
  });
  const chooseMode = (next: ProtectionMode) => {
    try {
      if (!account) throw Error('Connect a wallet first.');
      if (next === 'APP_ONLY' && !signer) throw Error('Register and select a passkey first.');
      setAppConfirmation(account, next === 'APP_ONLY' ? signer : null); setMode(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change confirmation mode.'); }
  };
  const reviewAction = (kind: Review['kind'], prepare: Review['prepare']) => run(async () => {
    const prepared = await prepare();
    if (currentContext.current !== context) throw Error('Action context changed. Review again.');
    setReview({ kind, prepared, prepare, context });
  });
  const handoff = () => reviewAction('handoff', () => {
    if (!account || !signer || !isAddress(token)) throw Error('Connect the current recipient, select a registered wallet and verify a launch.');
    return prepareTransferCreatorFeeRecipient(publicClient, token as Address, account, signer.address);
  });
  const execute = () => run(async () => {
    if (!review || !signer || currentContext.current !== review.context) throw Error('Review this action again.');
    const prepared = await review.prepare();
    if (transactionHash(prepared, signer.rpId) !== transactionHash(review.prepared, signer.rpId) || (!('kind' in prepared) && !('kind' in review.prepared) && prepared.intent?.amount !== review.prepared.intent?.amount)) throw Error('Action terms changed after review. Review the current amount again.');
    if (currentContext.current !== review.context) throw Error('Wallet context changed.');
    const beforeSign = async () => {
      if (currentContext.current !== review.context) throw Error('Wallet or action changed during signing.');
      if (review.kind === 'handoff') await confirmWithPasskey(prepared, signer);
      const fresh = await review.prepare();
      if (transactionHash(fresh, signer.rpId) !== transactionHash(prepared, signer.rpId) || (!('kind' in fresh) && !('kind' in prepared) && fresh.intent?.amount !== prepared.intent?.amount)) throw Error('Action changed during confirmation. Review it again.');
      if (currentContext.current !== review.context) throw Error('Wallet or action changed during confirmation.');
    };
    const result = review.kind === 'handoff'
      ? await executePreparedWrite(publicClient, wallet.wallet!, prepared, { onPhase: setTx, beforeSign, contextValid: () => currentContext.current === review.context })
      : await executeProtectedAction(publicClient, signer, prepared, { onPhase: setTx, beforeSign, contextValid: () => currentContext.current === review.context });
    if (result.kind === 'failed') throw Error(result.reason);
    setReview(null); await Promise.all([rights.refetch(), protectedState.refetch(), protectedAsset.refetch()]);
    toast.success('Confirmed on Monad Testnet', { description: result.hash });
  });
  const prepareProtected = (action: 'claim' | 'send' | 'withdraw' | 'release') => reviewAction('protected', () => {
    if (!signer || !isAddress(asset)) throw Error('Select a registered wallet and valid asset.');
    if (action === 'claim') return asset === zeroAddress ? prepareFeeClaim(publicClient, signer.address) : prepareFeeClaimToken(publicClient, signer.address, asset as Address);
    if (action === 'release') { if (!isAddress(token)) throw Error('Select a launch token.'); return prepareBuybackRelease(publicClient, token as Address, signer.address); }
    const decimals = asset === zeroAddress ? 18 : !protectedAsset.isError ? protectedAsset.data?.decimals : undefined;
    if (decimals === undefined) throw Error('Asset precision unavailable. Refresh the asset first.');
    const raw = parseExact(amount, decimals);
    if (action === 'withdraw') return prepareMarginWithdraw(publicClient, signer.address, { token: asset as Address, amount: raw });
    if (!isAddress(destination)) throw Error('Enter a destination address.');
    return prepareTransfer(publicClient, signer.address, { recipient: destination as Address, asset: asset as Address, amount: raw });
  });
  const canHandoff = !!wallet.wallet && !!signer && !rights.isError && !!rights.data?.launch.exists && rights.data.launch.creatorFeeRecipient.toLowerCase() === account?.toLowerCase() && rights.data.launch.creatorFeeRecipient.toLowerCase() !== signer.address.toLowerCase() && !rights.data.pending;
  const balances = !protectedState.isError ? protectedState.data : undefined;
  return <section className="rp-protect" data-testid="protected-earn" aria-labelledby="rp-protect-h">
    <header><h2 id="rp-protect-h"><RiShieldCheckLine size={16} aria-hidden/> Protected Earn</h2><p className="rp-note">Keep connected-wallet funds and the independent passkey fee wallet separate.</p></header>
    <ul className="rp-protect-modes" data-testid="protection-modes">{(Object.keys(PROTECTION_MODES) as ProtectionMode[]).map(key => {
      const info = PROTECTION_MODES[key];
      return <li className="rp-protect-mode" key={key} data-mode={key} data-bypassable={info.bypassable} data-available={info.available}>
        <label><input type="radio" name="earn-protection" checked={mode === key} disabled={!info.available || busy || !account} onChange={() => chooseMode(key)}/> {info.title}</label><p>{info.summary}</p><p className="rp-protect-honesty">{info.honesty}</p>
      </li>;
    })}</ul>
    <div className="rp-protect-signer"><h3>Register or recover a passkey fee wallet</h3>
      <label className="rp-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/> Store public credential ID, address, domain and derivation versions in this browser. No key material is stored.</label>
      <div className="rp-protect-row"><button className="rp-btn rp-btn-primary rp-btn-sm" disabled={busy || !consent || !account} onClick={() => void enroll('create')}>Create a passkey</button><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !consent || !account} onClick={() => void enroll('reuse')}>Use an existing passkey</button></div>
      <label>Registered passkey <select aria-label="Registered passkey" value={credential} disabled={busy} onChange={event => setCredential(event.target.value)}><option value="">Select a registration…</option>{enrollments.map(entry => <option key={entry.credentialId} value={entry.credentialId}>{entry.address}</option>)}</select></label>
      {signer && <div data-testid="protected-wallet"><AddressChip value={signer.address} label="protected fee wallet"/><p className="rp-note">Domain {signer.rpId} · Monad Testnet · derivation v1. Losing this credential or its PRF support can make this wallet unrecoverable. Existing credentials from another domain cannot reproduce it here.</p><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy} onClick={() => void recover()}>Recover and verify address</button></div>}
    </div>
    <div className="rp-protect-handoff"><h3>Redirect future creator fees</h3><p className="rp-note">Creator attribution and fee-recipient rights are separate. Existing escrow credits stay with their original recipient. This changes future fees only.</p>
      <p>Original connected wallet: {account ?? 'Disconnected'} · Existing native fee credit: {!originalState.isError && originalState.data ? exactAmount(originalState.data.nativeCreditRaw, 18, 6) : 'Unavailable'}. Existing ERC20 credits remain with this account; claim them in Available to claim.</p>
      <label>Created launches <select aria-label="Launch to protect" value={token} onChange={event => setToken(event.target.value)}><option value="">Select a created launch…</option>{created.data?.pages.flatMap(page => page.data).map(launch => <option key={launch.token} value={launch.token}>{launch.symbol} · {launch.token}</option>)}</select></label>
      {created.hasNextPage && <button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={created.isFetchingNextPage} onClick={() => void created.fetchNextPage()}>Load more launches</button>}
      {created.isError && <p role="alert">Creator discovery unavailable or its cursor expired. <button onClick={() => void created.refetch()}>Refresh list</button> You can verify a token manually.</p>}
      <label>Manual import for assigned recipients or indexing delays <input aria-label="Launch token address" value={token} onChange={event => setToken(event.target.value.trim())} placeholder="0x…"/></label>
      {rights.isError && <p role="alert">Recipient verification unavailable. <button onClick={() => void rights.refetch()}>Retry verification</button></p>}
      {rights.data && !rights.isError && <div><p>Immutable creator: {rights.data.launch.deployer}</p><p>Current recipient: {rights.data.launch.creatorFeeRecipient}</p>{!rights.data.launch.exists && <p>Not a RetroPick launch.</p>}{rights.data.pending && <p role="alert">Pending owner recipient override: handoff blocked until it is resolved.</p>}{signer?.address.toLowerCase() === rights.data.launch.creatorFeeRecipient.toLowerCase() && <p>Already protected by this passkey wallet.</p>}{rights.data.launch.creatorFeeRecipient.toLowerCase() !== account?.toLowerCase() && <p>The connected creator wallet has no current fee-recipient authority.</p>}</div>}
      <button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !canHandoff} onClick={() => void handoff()}>Review handoff</button>
    </div>
    {signer && <div className="rp-protect-signer"><h3>Protected wallet balances and actions</h3><p>Wallet MON: {balances ? exactAmount(balances.monRaw, 18, 6) : 'Unavailable'} · Native fee credit: {balances ? exactAmount(balances.nativeCreditRaw, 18, 6) : 'Unavailable'} · Free MON margin: {balances ? exactAmount(balances.nativeMarginRaw, 18, 6) : 'Unavailable'}</p>
      {balances?.issues.map(issue => <p role="status" key={issue}>{issue}. Token history is incomplete; import an asset to verify its balance.</p>)}
      {protectedState.isError && <button onClick={() => void protectedState.refetch()}>Retry protected balances</button>}
      <p className="rp-note">This address pays its own MON gas. Fund it separately; no automatic funding or withdrawal occurs.</p>
      <label>Asset (zero address = native MON) <input aria-label="Protected asset" value={asset} onChange={event => setAsset(event.target.value.trim())}/></label>
      {asset !== zeroAddress && <p>Token wallet / fee credit / free margin: {!protectedAsset.isError && protectedAsset.data ? `${protectedAsset.data.balance} / ${protectedAsset.data.credit} / ${protectedAsset.data.margin} atomic units` : 'Unavailable'} <button onClick={() => void protectedAsset.refetch()}>Refresh asset</button></p>}
      <label>Amount <input aria-label="Protected amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)}/></label><label>Send destination <input aria-label="Protected destination" value={destination} onChange={event => setDestination(event.target.value.trim())}/></label>
      <div className="rp-protect-row"><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !balances} onClick={() => void prepareProtected('claim')}>Review fee claim</button><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !balances || !amount} onClick={() => void prepareProtected('send')}>Review send</button><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !balances || !amount} onClick={() => void prepareProtected('withdraw')}>Review margin withdrawal</button><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !balances || !isAddress(token)} onClick={() => void prepareProtected('release')}>Review buyback release</button></div>
    </div>}
    {review && <div className="rp-protect-prepared" data-testid="prepared-handoff"><strong>{review.prepared.label} · Monad Testnet</strong><p>Signing account: {review.prepared.account}</p><p>Contract / destination: {review.prepared.to}</p><p>Native transaction value: {review.prepared.value.toString()} wei</p><ul>{review.prepared.checks.map(check => <li key={check}>{check}</li>)}</ul><p>{review.kind === 'handoff' ? 'Confirm with the registered passkey, then sign with the current recipient wallet. Future fees only.' : 'A fresh passkey ceremony signs this action from the independent protected wallet.'}</p><button className="rp-btn rp-btn-primary rp-btn-sm" disabled={busy || (review.kind === 'handoff' && !wallet.wallet)} onClick={() => void execute()}>Confirm and sign {review.kind === 'handoff' ? 'handoff' : 'protected action'}</button><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy} onClick={() => setReview(null)}>Cancel</button></div>}
    {tx && <p role="status">{tx.kind}{'hash' in tx ? ` · ${tx.hash}` : ''}</p>}{error && <ErrorState title="Protected Earn" text={error}/>}
    <p className="rp-note">App-level confirmation is bypassable outside this app. Onchain policy is unavailable. Referral payouts and bank withdrawals are unavailable on Monad Testnet.</p>
  </section>;
}
