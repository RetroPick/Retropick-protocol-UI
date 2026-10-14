'use client';
import './launch-table.css';

import { useQuery } from '@tanstack/react-query';
import { loadEnrollments } from '@/lib/mera-signer/enrollment';
import Link from '@/components/product/safe-link';
import { Check, ChevronRight, ImagePlus, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { approvedPairAssets } from '@/lib/domain/launchpad-fixtures';
import type { LaunchpadType } from '@/lib/domain/launchpad-types';
import { useDemo } from '@/components/product/provider';
import { useWallet } from '@/wallet/provider';
import { DATA_MODE } from '@/lib/live/env';
import { publicClient } from '@/lib/live/public-client';
import { exactAmount } from '@/lib/live/format';
import { useRouter } from '@/lib/next-compat';
import { seedLaunch } from '@/lib/live/queries';
import { markStage } from '@/lib/live/performance';
import { confirmedLaunchSeed, LAUNCH_METADATA_LIMITS, utf8Bytes, validFeeRecipient, validateCreatorFee, validateLaunchMetadata, type LaunchMetadata } from '@/lib/live/create-validation';
import { resolveMediaSrc } from '@/lib/media/resolve';
import { TokenImage } from '@/components/product/token-image';
import { prepareLogoFile, uploadLogo } from '@/lib/media/upload';
import { CATEGORY_LABELS, quoteAssets, quoteAssetById, type QuoteAsset } from '@retropick/launchpad-sdk/quote-assets';
import { QuotePicker, type PickerState } from './quote-picker';
import { PairAvatars } from '@/components/trading/pair-identity';
import { factoryAbi } from '@retropick/launchpad-sdk/abis/factoryAbi';
import { addresses } from '@retropick/launchpad-sdk/chain';
import { readLaunchPreconditions, type LaunchPreconditions } from '@retropick/launchpad-sdk/registry';
import { prepareLaunchToken } from '@retropick/launchpad-sdk/prepare';
import { decodeTokenLaunched } from '@retropick/launchpad-sdk/decode';
import { parseExact } from '@retropick/launchpad-sdk/math';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { formatUnits, type Address, type Hash } from 'viem';
import CreateMarket from '@/features/create-market/wizard';

type CreationType = Exclude<LaunchpadType, 'all'>;
type FeeDestination = 'feeWallet' | 'buybackVest' | 'holders';

// DEMO-only illustrative terms (live mode reads every term from the deployed factory).
const LAUNCH_FEE = 'Set by factory · DEMO';
const GRADUATES_AT = 'Set by launch config · DEMO';
const CURVE_FEE = '1.0% · DEMO';
const SUPPLY = '1,000,000,000';

const feeDestinations: { id: FeeDestination; title: string; body: string; supportedLive: boolean }[] = [
  { id: 'feeWallet', title: 'Your fee wallet', body: 'Fees accrue to your fee wallet to claim.', supportedLive: true },
  { id: 'buybackVest', title: 'Buyback & vest', body: 'Part of each creator fee buys the token back; bought tokens lock and release to your fee escrow over time, with a protocol share on release.', supportedLive: true },
  { id: 'holders', title: 'Holders', body: 'Fee distribution to holders is not supported by the deployed V2 contracts.', supportedLive: false },
];

function LaunchStepper({ active }: { active: number }) {
  const steps = ['Token', 'Market & economics', 'Review'];
  return <div className="stepper token-stepper" aria-label="Token launch progress">{steps.map((step, index) => <div className={index === active ? 'current' : index < active ? 'done' : ''} key={step} aria-current={index === active ? 'step' : undefined}><b>{index < active ? <Check size={13}/> : index + 1}</b>{step}</div>)}</div>;
}

type LivePhase = { kind: 'idle' } | TxPhase;
type UploadState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; uri: string; gateway: string | null } | { kind: 'error'; message: string };

function TokenLaunchWizard({ type }: { type: 'crypto' | 'stocks' }) {
  const isStock = type === 'stocks';
  const demo = useDemo();
  const wallet = useWallet();
  const router = useRouter();
  const live = DATA_MODE === 'live';
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<null | { token: string; hash: Hash }>(null);
  const [error, setError] = useState('');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' });
  const [showManualUri, setShowManualUri] = useState(false);
  const [feeDestination, setFeeDestination] = useState<FeeDestination>('feeWallet');
  const [showVestDetail, setShowVestDetail] = useState(false);
  const [venue, setVenue] = useState<'KURU' | 'UNISWAP_V4'>('KURU');
  const [form, setForm] = useState({ name: '', ticker: '', logo: '', description: '', x: '', telegram: '', discord: '', website: '', farcaster: '', pair: 'MON', configId: '', feeWallet: '', creatorFee: '0', openingBuy: '0' });
  const [selectedAsset, setSelectedAsset] = useState<QuoteAsset>(() => quoteAssetById('crypto-mon')!);
  const [picker, setPicker] = useState<PickerState>({ search: '', category: isStock ? 'STOCKS' : 'ALL' });
  const [reviewedEconomics, setReviewedEconomics] = useState<Hash | undefined>();
  const [previewDone, setPreviewDone] = useState(false);
  const [phase, setPhase] = useState<LivePhase>({ kind: 'idle' });
  const fixturePairs = approvedPairAssets.filter((asset) => isStock ? asset.assetClass === 'STOCK_QUOTE' : asset.assetClass === 'CRYPTO');
  const pairOptions = live ? [] : fixturePairs;
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const terms = useQuery({ queryKey: ['launchpad', 10143, 'launch-terms', wallet.account, selectedAsset.monadTestnetAddress], enabled: live, queryFn: () => readLaunchPreconditions(publicClient, wallet.account ?? undefined, undefined, { candidateAddresses: selectedAsset.monadTestnetAddress ? [selectedAsset.monadTestnetAddress as Address] : [] }), staleTime: 10000, refetchInterval: 30000 });
  const preconditions = terms.isError ? null : terms.data ?? null;
  const preconditionsError = terms.error instanceof Error ? 'Launch terms unavailable. Retry without losing your draft.' : null;
  const uploadGeneration = useRef(0);
  const localPreview = useRef<string | null>(null);
  const selectedFile = useRef<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState('');
  useEffect(() => () => { uploadGeneration.current++; if (localPreview.current) URL.revokeObjectURL(localPreview.current); }, []);
  const protectedWallets = loadEnrollments().filter(entry => entry.associatedCreatorWallet?.toLowerCase() === wallet.account?.toLowerCase());
  const config = useMemo(() => preconditions?.configs.find((entry) => entry.enabled && entry.id.toString() === form.configId) ?? preconditions?.configs.find((entry) => entry.enabled) ?? null, [preconditions, form.configId]);
  const admittedQuotes = useMemo(() => {
    if (!preconditions) return [] as { id: string; symbol: string; name: string; venues: ('KURU' | 'UNISWAP_V4')[]; thresholdRaw: bigint; decimals: number }[];
    const byAddress = new Map<string, { id: string; symbol: string; name: string; venues: ('KURU' | 'UNISWAP_V4')[]; thresholdRaw: bigint; decimals: number }>();
    for (const quote of preconditions.quotes) {
      const key = quote.address.toLowerCase();
      const venueName = quote.venue === 1 ? 'KURU' : 'UNISWAP_V4';
      const existing = byAddress.get(key);
      if (existing) existing.venues.push(venueName);
      else byAddress.set(key, { id: quote.address, symbol: quote.symbol, name: quote.address === '0x0000000000000000000000000000000000000000' ? 'Native Monad' : quote.address, venues: [venueName], thresholdRaw: quote.graduationThreshold, decimals: quote.decimals });
    }
    return [...byAddress.values()];
  }, [preconditions]);
  const livePair = admittedQuotes.find((quote) => quote.id.toLowerCase() === selectedAsset.monadTestnetAddress?.toLowerCase());
  const venuesForPair = livePair?.venues ?? [];
  const activeVenue = venue;
  const selectedQuote = preconditions?.quotes.find((quote) => quote.address.toLowerCase() === livePair?.id.toLowerCase() && quote.venue === (activeVenue === 'KURU' ? 1 : 0));
  const executable = !!selectedQuote && selectedAsset.status !== 'DISABLED';
  const localOnly = live && !executable;
  const economics = useQuery({ queryKey: ['launch-economics', config?.id.toString(), selectedAsset.monadTestnetAddress, activeVenue, preconditions?.blockNumber.toString()], enabled: live && executable && !!config && !!preconditions, queryFn: () => publicClient.readContract({ address: addresses.factory, abi: factoryAbi, functionName: 'previewVenueEconomics', args: [config!.id, livePair!.id as Address, activeVenue === 'KURU' ? 1 : 0], blockNumber: preconditions!.blockNumber }), staleTime: 10000 });
  const launchFeeMon = preconditions ? exactAmount(preconditions.launchFee, 18, 18) : null;
  const thresholdDisplay = selectedQuote ? exactAmount(selectedQuote.graduationThreshold, selectedQuote.decimals, selectedQuote.decimals) : null;
  const maxCreatorFeeBps = preconditions && config ? [preconditions.maxCreatorTaxBps, 2000n - config.curveFeeBps, 2000n - preconditions.currentHookFeeBps].reduce((max, value) => value < max ? value : max) : 0n;
  const maxCreatorFeePercent = formatUnits(maxCreatorFeeBps > 0n ? maxCreatorFeeBps : 0n, 2);
  const pair = live ? { symbol: selectedQuote?.symbol ?? selectedAsset.symbol, name: selectedAsset.name } : (pairOptions.find((asset) => asset.id.toLowerCase() === form.pair.toLowerCase()) ?? pairOptions[0]);
  const metadata: LaunchMetadata = { name: form.name.trim(), ticker: form.ticker.trim(), logo: form.logo.trim(), description: form.description, x: form.x.trim(), telegram: form.telegram.trim(), discord: form.discord.trim(), website: form.website.trim(), farcaster: form.farcaster.trim() };
  const previewImage = live ? previewLocal || resolveMediaSrc(metadata.logo) : image;

  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use a square PNG, JPEG or WebP image up to 5 MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setImageName(file.name); };
    reader.readAsDataURL(file);
  };

  const uploadSelected = async (file: File) => {
    const generation = ++uploadGeneration.current;
    selectedFile.current = file;
    if (localPreview.current) URL.revokeObjectURL(localPreview.current);
    localPreview.current = URL.createObjectURL(file);
    setPreviewLocal(localPreview.current);
    set('logo', '');
    setUpload({ kind: 'busy' }); setError('');
    try {
      const result = await uploadLogo(await prepareLogoFile(file));
      if (generation !== uploadGeneration.current) return;
      setForm(current => ({ ...current, logo: result.uri }));
      setUpload({ kind: 'done', uri: result.uri, gateway: resolveMediaSrc(result.uri) });
    } catch (cause) {
      if (generation === uploadGeneration.current) setUpload({ kind: 'error', message: cause instanceof Error ? cause.message : 'Image upload failed.' });
    }
  };
  const onLiveImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (file) void uploadSelected(file);
  };
  const onManualLogo = (event: ChangeEvent<HTMLInputElement>) => {
    uploadGeneration.current++; selectedFile.current = null;
    if (localPreview.current) URL.revokeObjectURL(localPreview.current);
    localPreview.current = null; setPreviewLocal('');
    setUpload({ kind: 'idle' }); set('logo', event.target.value);
  };

  const canContinue = () => {
    if (live) return upload.kind === 'busy' ? 'Wait for the image upload to finish.' : upload.kind === 'error' ? 'Retry the selected image upload or choose a URI.' : validateLaunchMetadata(metadata);
    if (!form.name.trim()) return 'Give your token a name.';
    if (!/^[A-Z0-9]{2,10}$/.test(form.ticker)) return 'Ticker needs 2\u201310 uppercase letters or digits.';
    if (form.description.length > 256) return 'Keep the description within 256 characters.';
    return '';
  };
  const canLaunch = () => {
    const fee = Number(form.creatorFee);
    if (!Number.isFinite(fee) || fee < 0) return 'Creator fee must be zero or greater.';
    if (live) {
      const metadataIssue = canContinue(); if (metadataIssue) return metadataIssue;
      if (!preconditions || terms.isError) return 'Refresh launch terms before continuing.';
      const issue = validateCreatorFee(form.creatorFee, maxCreatorFeeBps > 0n ? maxCreatorFeeBps : 0n);
      if (issue) return issue;
      if (!preconditions?.launchEnabled) return 'The factory is not accepting launches right now.';
      if (preconditions?.canLaunch === false) return 'This wallet is not authorized to launch right now.';
      if (!config?.enabled) return 'No enabled launch configuration is live on the factory.';
      if (!livePair || !executable) return 'This quote asset is not admitted for the selected venue. Save a local preview instead.';
      if (!reviewedEconomics || economics.isError || reviewedEconomics !== economics.data) return 'Launch economics changed or are unavailable. Return to the market step and review again.';
      if (feeDestination === 'holders') return 'Holder fee distribution is not supported by the deployed contracts.';
    } else {
      if (fee > 10) return 'Creator fee must be between 0 and 10.0%.';
      const buy = Number(form.openingBuy);
      if (!Number.isFinite(buy) || buy < 0) return 'Opening buy must be zero or greater.';
    }
    if (!validFeeRecipient(form.feeWallet.trim())) return 'Use a valid nonzero creator fee wallet address, or leave it empty to default to your wallet.';
    return '';
  };
  const next = () => { const issue = canContinue() || (step === 1 && live && executable && (!economics.data || economics.isError) ? 'Wait for verified economics before reviewing.' : ''); setError(issue); if (!issue) { if (step === 1) setReviewedEconomics(economics.data); setStep((s) => Math.min(2, s + 1)); } };
  const savePreview = () => { try { localStorage.setItem('retropick-quote-preview', JSON.stringify({ provenance: 'LOCAL_PREVIEW', metadata, assetId: selectedAsset.id, quoteAddress: selectedAsset.monadTestnetAddress, venue, creatorFee: form.creatorFee, feeDestination, economics: null })); setPreviewDone(true); } catch { setError('This browser could not save your local preview.'); } };

  const launchDemo = () => {
    try {
      localStorage.setItem('retropick-token-launch-draft', JSON.stringify({
        name: form.name, symbol: form.ticker, description: form.description,
        x: form.x, telegram: form.telegram, website: form.website,
        launchKind: isStock ? 'STOCK_PAIRED_TOKEN' : 'CRYPTO_TOKEN',
        quoteAsset: pair.symbol, feeWallet: form.feeWallet.trim() || null,
        creatorFee: Number(form.creatorFee), openingBuy: Number(form.openingBuy),
        feeDestination, supply: 1_000_000_000,
        provenance: 'DEMO',
      }));
      setError('');
      setDoneDemo(true);
    } catch { setError('This browser could not save the local demo draft.'); }
  };
  const [doneDemo, setDoneDemo] = useState(false);

  const launchLive = async () => {
    const issue = canContinue() || canLaunch();
    if (issue) { setError(issue); return; }
    if (!wallet.wallet || !wallet.account || wallet.chainId !== 10143 || !config || !livePair) return;
    markStage('create:click');
    setError('');
    setPhase({ kind: 'preparing' });
    try {
      const prepared = await prepareLaunchToken(publicClient, wallet.account, {
        name: metadata.name,
        symbol: metadata.ticker,
        logo: metadata.logo,
        description: metadata.description,
        socials: { twitter: metadata.x, telegram: metadata.telegram, discord: metadata.discord, website: metadata.website, farcaster: metadata.farcaster },
        creatorFeeRecipient: (form.feeWallet.trim() || undefined) as Address | undefined,
        // hundredths of a percent are exactly basis points at two decimals
        creatorTaxBps: parseExact(form.creatorFee || '0', 2),
        buybackEnabled: feeDestination === 'buybackVest',
        launchConfigId: config.id,
        pairToken: livePair.id as Address,
        venue: activeVenue === 'KURU' ? 1 : 0,
        expectedEconomics: reviewedEconomics,
      });
      const result = await executePreparedWrite(publicClient, wallet.wallet, prepared, { onPhase: setPhase });
      if (result.kind === 'success') {
        markStage('create:receipt-confirmed');
        const launched = decodeTokenLaunched(result.receipt.logs.filter((log) => log.address.toLowerCase() === addresses.factory.toLowerCase()));
        const seed = confirmedLaunchSeed(launched, { factory: addresses.factory, creator: wallet.account, quote: livePair.id as Address, configId: config.id }, metadata, livePair, result.receipt);
        seedLaunch(seed);
        markStage('create:receipt-seeded');
        setDone({ token: seed.token, hash: result.hash });
        router.push(`/launchpad/token/${seed.token}`);
      } else {
        setError(result.reason);
        setPhase({ kind: 'idle' });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Launch failed.');
      setPhase({ kind: 'idle' });
    }
  };

  if (previewDone) return <div className="guide"><div className="panel success-page"><Check size={46} className="positive"/><h1>Your local preview is ready.</h1><p>{form.name} / {selectedAsset.symbol} is saved in this browser. No wallet signature, token or market was created.</p><div className="notice">{selectedAsset.unavailableReason}</div><button className="btn primary" onClick={() => setPreviewDone(false)}>Edit preview</button><Link href="/launchpad" className="btn">Explore live launches</Link></div></div>;
  if (done) return <div className="guide"><div className="panel success-page"><Check size={46} className="positive"/><h1>{form.name} is live.</h1><p>Deployed on Monad Testnet (chain 10143). Transaction <code className="tx-hash">{done.hash}</code></p><div className="notice">The bonding curve is open. Discovery updates as the indexer observes the launch.</div><div className="prism-actions"><Link href={`/launchpad/token/${done.token}`} className="btn primary">Open {form.ticker} <ChevronRight size={15}/></Link><Link href="/launchpad" className="btn">Explore Launchpad</Link></div></div></div>;
  if (doneDemo) return <div className="guide"><div className="panel success-page"><Check size={46} className="positive"/><h1>Your token launch draft is ready.</h1><p>{form.name || 'Your token'} remains a local DEMO draft. No token, pool, pair, contract address or onchain market was created — the curve does not open from this interface.</p><div className="notice">A real launch must use reviewed deployment configuration, an admitted quote-asset registry and a wallet-signed transaction.</div><div className="prism-actions"><Link href="/launchpad" className="btn primary">Explore Launchpad</Link><button className="btn" onClick={() => setDoneDemo(false)}>Edit draft</button></div></div></div>;

  const counter = (value: string, max: number) => <span className="char-counter">{live ? utf8Bytes(value) : value.length}/{max}{live ? ' bytes' : ''}</span>;
  const fieldWithCounter = (label: string, key: keyof typeof form, placeholder: string, max: number) => <label className="field"><span className="field-head"><span>{label}</span>{counter(form[key], max)}</span><input maxLength={max} value={form[key]} onChange={(event) => set(key, event.target.value)} placeholder={placeholder}/></label>;
  const phaseLabel = (value: LivePhase): string => {
    switch (value.kind) {
      case 'approving': return 'Approving quote asset…';
      case 'simulating': return 'Simulating launch…';
      case 'awaiting-signature': return 'Confirm in your wallet…';
      case 'broadcasting': return 'Broadcasting…';
      case 'confirming': return 'Waiting for receipt…';
      case 'preparing': return 'Preparing…';
      default: return '';
    }
  };
  const busy = phase.kind !== 'idle' && phase.kind !== 'failed';

  return <><div className="page-heading"><div><h1>Launch a token.</h1><p>Token, market &amp; economics, then review. {live ? 'The curve opens when your launch transaction confirms.' : 'DEMO draft: nothing is deployed or signed from this interface.'}</p></div><span className="tag">{live ? 'LIVE · 10143' : 'DEMO · NOT DEPLOYED'}</span></div><LaunchStepper active={step}/><div className="workspace token-create-workspace"><section className="panel">{step === 0 && <><div className="form-title"><h2>1 · Token</h2><p>Give it a name and a face.</p></div>{live ? <>
      <div className="image-picker"><span className="field-label">Image</span><div className="image-picker-row">{previewImage ? <TokenImage src={previewImage} alt="Token image preview" className="image-preview" fallback={<span className="image-empty"><ImagePlus size={22}/></span>}/> : <span className="image-empty"><ImagePlus size={22}/></span>}<div><label className="btn image-choose"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onLiveImage} aria-label="Choose token image"/>Choose image</label>{upload.kind === 'busy' && <small role="status">Uploading image…</small>}{upload.kind === 'done' && <small>Stored at <span className="tx-hash">{upload.uri}</span>{upload.gateway ? <> · <a className="text-link" href={upload.gateway} target="_blank" rel="noreferrer">view</a></> : null} · {utf8Bytes(upload.uri)}/{LAUNCH_METADATA_LIMITS.logo} bytes onchain</small>}{upload.kind === 'error' && <small role="alert">{upload.message}<button type="button" className="text-link" onClick={() => selectedFile.current && void uploadSelected(selectedFile.current)}>Retry upload</button></small>}{upload.kind === 'idle' && !metadata.logo && <small>Square PNG, JPEG, WebP or GIF up to 5 MB.</small>}<button type="button" className="text-link" onClick={() => setShowManualUri((open) => !open)}>{showManualUri ? 'Hide URI field — upload instead' : 'Paste a URI instead'}</button></div></div></div>
      {showManualUri && <label className="field"><span className="field-head"><span>Logo URI</span>{counter(form.logo, LAUNCH_METADATA_LIMITS.logo)}</span><input value={form.logo} maxLength={LAUNCH_METADATA_LIMITS.logo} onChange={onManualLogo} placeholder="https://… or ipfs://…"/><small>Optional public HTTPS, IPFS or Arweave URI stored in token metadata.</small></label>}
    </> : <div className="image-picker"><span className="field-label">Image</span><div className="image-picker-row">{image ? <img src={image} alt="Token image preview" className="image-preview"/> : <span className="image-empty"><ImagePlus size={22}/></span>}<div><label className="btn image-choose"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} aria-label="Choose token image"/>Choose image</label><small>{imageName || 'No file chosen'}</small><small>Square, up to 5 MB</small></div></div></div>}{fieldWithCounter('Name', 'name', 'Retro Coin', live ? LAUNCH_METADATA_LIMITS.name : 32)}<div className="form-grid">{fieldWithCounter('Ticker', 'ticker', 'RETRO', live ? LAUNCH_METADATA_LIMITS.ticker : 10)}<div/></div><label className="field"><span className="field-head"><span>Description</span>{counter(form.description, live ? LAUNCH_METADATA_LIMITS.description : 256)}</span><textarea maxLength={live ? LAUNCH_METADATA_LIMITS.description : 256} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="What is it, in a sentence or two. No links."/></label><div className="form-grid"><label className="field"><span>X</span><input maxLength={live ? LAUNCH_METADATA_LIMITS.x : undefined} value={form.x} onChange={(event) => set('x', event.target.value)} placeholder="handle or URL"/></label><label className="field"><span>Telegram</span><input maxLength={live ? LAUNCH_METADATA_LIMITS.telegram : undefined} value={form.telegram} onChange={(event) => set('telegram', event.target.value)} placeholder="username or t.me"/></label></div><label className="field"><span>Website</span><input maxLength={live ? LAUNCH_METADATA_LIMITS.website : undefined} value={form.website} onChange={(event) => set('website', event.target.value)} placeholder="https://"/></label>{live && <div className="form-grid">{fieldWithCounter('Discord', 'discord', 'Discord invite or URL', LAUNCH_METADATA_LIMITS.discord)}{fieldWithCounter('Farcaster', 'farcaster', 'Handle or URL', LAUNCH_METADATA_LIMITS.farcaster)}</div>}</>}{step === 1 && <>{live ? <>
    <div className="form-title"><h2>2 · Market &amp; economics</h2><p>Terms read live from the deployed factory.</p></div>
    {preconditionsError && <div role="alert" className="form-error">{preconditionsError}<button type="button" className="btn ghost" onClick={() => void terms.refetch()}>Retry launch terms</button></div>}
    {!preconditions && !preconditionsError && <p className="empty-copy">Loading launch terms from the factory…</p>}
    <QuotePicker selected={selectedAsset} onSelect={asset => { setSelectedAsset(asset); setReviewedEconomics(undefined); }} state={picker} onState={setPicker} quotes={preconditions?.quotes ?? []} venue={activeVenue === 'KURU' ? 1 : 0} checking={terms.isFetching}/>
    {localOnly && <div className="notice" role="status">Local preview · {selectedAsset.unavailableReason} Graduation economics are unavailable for this asset and venue.</div>}
    {preconditions && <>{preconditions.configs.filter((entry) => entry.enabled).length > 1 && <label className="field"><span>Launch configuration</span><select value={config?.id.toString() ?? ''} onChange={(event) => set('configId', event.target.value)}>{preconditions.configs.filter((entry) => entry.enabled).map((entry) => <option value={entry.id.toString()} key={entry.id.toString()}>Configuration {entry.id.toString()} · {exactAmount(entry.supply, 18, 0)} token supply</option>)}</select></label>}
    <div className="form-grid"><label className="field"><span>Graduates to</span><select value={activeVenue} onChange={(event) => setVenue(event.target.value === 'UNISWAP_V4' ? 'UNISWAP_V4' : 'KURU')}>{(['KURU', 'UNISWAP_V4'] as const).map((name) => <option value={name} key={name}>{name === 'KURU' ? 'Kuru orderbook' : 'Uniswap V4'}</option>)}</select><small>Fixed by the venue you choose; {livePair?.venues.length === 2 ? 'both venues are admitted for this pair.' : 'check admission for your selected venue.'}</small></label>
    <label className="field"><span>Creator fee wallet</span><input value={form.feeWallet} onChange={(event) => set('feeWallet', event.target.value)} placeholder="0x…"/><small>Defaults to your wallet. Protected wallets require an explicit choice.</small>{protectedWallets.length > 0 && <select aria-label="Choose protected fee recipient" value="" onChange={event => set('feeWallet', event.target.value)}><option value="">Choose a protected wallet…</option>{protectedWallets.map(entry => <option key={entry.credentialId} value={entry.address}>{entry.address}</option>)}</select>}</label></div>
    <div className="form-grid"><label className="field"><span>Creator fee</span><input inputMode="decimal" value={form.creatorFee} onChange={(event) => set('creatorFee', event.target.value)} placeholder="0"/><small>Up to {maxCreatorFeePercent}% of each trade, on top of the {config ? formatUnits(config.curveFeeBps, 2) : '—'}% curve fee. Unit: %.</small></label><div/></div>
    <div className="fee-section"><span className="field-label">Where your creator fees go</span><div className="fee-options">{feeDestinations.filter((option) => option.supportedLive).map((option) => <label key={option.id} className={`fee-option${feeDestination === option.id ? ' selected' : ''}`}><input type="radio" name="feeDestination" value={option.id} disabled={!option.supportedLive} checked={feeDestination === option.id} onChange={() => option.supportedLive && setFeeDestination(option.id)}/><strong>{option.title}</strong><p>{option.body}</p></label>)}</div></div>
    <p className="launch-info-line">Launch fee {launchFeeMon !== null ? `${launchFeeMon} MON` : '—'}. Graduates at {thresholdDisplay !== null ? `${thresholdDisplay} ${livePair?.symbol}` : '—'}. Curve fee {config ? `${formatUnits(config.curveFeeBps, 2)}%` : '—'}.</p>
    <p className="launch-info-line">Your confirmed launch opens its token page immediately. Buy from the curve with a separate wallet transaction.</p>
  </>}</> : <><div className="form-title"><h2>2 · Market &amp; economics</h2><p>Choose what it trades against.</p></div><label className="field"><span>Paired with</span><select value={pair && 'id' in pair ? (pair as { id: string }).id : form.pair} onChange={(event) => set('pair', event.target.value)}>{pairOptions.map((asset) => <option value={asset.id} key={asset.id}>{asset.symbol} · {asset.name}</option>)}</select><small>Buyers pay in {pair.symbol} on the curve and in the pool after graduation.</small></label><label className="field"><span>Creator fee wallet</span><input value={form.feeWallet} onChange={(event) => set('feeWallet', event.target.value)} placeholder="0x…"/><small>Defaults to your wallet.</small></label><div className="form-grid"><label className="field"><span>Creator fee</span><input inputMode="decimal" value={form.creatorFee} onChange={(event) => set('creatorFee', event.target.value)} placeholder="0"/><small>Up to 10.0% of each trade. Unit: %.</small></label><label className="field"><span>Opening buy</span><input inputMode="decimal" value={form.openingBuy} onChange={(event) => set('openingBuy', event.target.value)} placeholder="0"/><small>Optional. Buys first, in the same transaction as the launch. Unit: {pair.symbol}.</small></label></div><div className="fee-section"><span className="field-label">Where your creator fees go</span><div className="fee-options">{feeDestinations.map((option) => <label key={option.id} className={`fee-option${feeDestination === option.id ? ' selected' : ''}${option.supportedLive ? '' : ' unsupported'}`} aria-disabled={!option.supportedLive || undefined}><input type="radio" name="feeDestination" value={option.id} disabled={!option.supportedLive} checked={feeDestination === option.id} onChange={() => option.supportedLive && setFeeDestination(option.id)}/><strong>{option.title}</strong><p>{option.body}</p>{option.id === 'buybackVest' && <button type="button" className="text-link" onClick={() => setShowVestDetail((open) => !open)}>How buyback &amp; vest works</button>}</label>)}</div>{showVestDetail && <div className="notice" style={{ marginTop: 14 }}>Buyback spend repurchases your own token on the open market. Repurchased tokens lock in the vesting contract and release to your fee escrow linearly over 5 years; each release keeps a protocol share. Illustrative description for this demo draft — no such contracts are deployed.</div>}</div><p className="launch-info-line">Launch fee {LAUNCH_FEE}. Graduates at {GRADUATES_AT}. Curve fee {CURVE_FEE}.</p></>}</>}{step === 2 && <><div className="form-title"><h2>3 · Review</h2><p>{live ? localOnly ? 'Local preview only. No wallet signature or onchain launch.' : 'Check every term. Your wallet signs one factory transaction.' : 'DEMO draft review. Nothing will be deployed.'}</p></div><dl className="detail-list review-list" data-testid="launch-review"><dt>Token</dt><dd>{form.name || '—'} · {form.ticker || '—'}</dd><dt>Supply</dt><dd>{live ? (!localOnly && config ? exactAmount(config.supply, 18, 0) : '—') : SUPPLY}</dd><dt>Quote asset</dt><dd>{live ? <span>{pair.symbol} · {selectedAsset.name}<br/><small>{selectedQuote ? `Verified at block ${preconditions?.blockNumber.toString()} · ${selectedQuote.decimals} decimals · policy v${selectedQuote.policyVersion}` : 'Not verified for this venue'}</small><br/><small className="tx-hash">{selectedAsset.monadTestnetAddress ?? 'Reference only · no Monad contract'}</small></span> : pair.symbol}</dd><dt>Graduation venue</dt><dd>{live ? (localOnly ? 'Unqualified · preview only' : activeVenue === 'KURU' ? 'Kuru orderbook' : 'Uniswap V4') : 'Kuru orderbook'}</dd><dt>Graduation threshold</dt><dd>{live ? (thresholdDisplay !== null ? `${thresholdDisplay} ${livePair?.symbol}` : '—') : GRADUATES_AT}</dd><dt>Curve fee</dt><dd>{live ? (!localOnly && config ? `${formatUnits(config.curveFeeBps, 2)}%` : '—') : CURVE_FEE}</dd><dt>Creator fee</dt><dd>{Number.isFinite(Number(form.creatorFee)) ? `${Number(form.creatorFee)}%` : '—'} → {feeDestinations.find((o) => o.id === feeDestination)?.title}</dd><dt>Creator fee wallet</dt><dd className="tx-hash">{form.feeWallet || 'Your connected wallet'}</dd><dt>Launch fee</dt><dd>{live ? (launchFeeMon !== null ? `${launchFeeMon} MON` : '—') : LAUNCH_FEE}</dd></dl></>}{error && <div role="alert" className="form-error">{error}</div>}{busy && <div role="status" className="launch-info-line" data-tx-phase={phase.kind}>{phaseLabel(phase)}</div>}<div className="form-actions"><button className="btn ghost" disabled={step === 0 || busy} onClick={() => { setError(''); setStep((s) => Math.max(0, s - 1)); }}>Back</button>{step < 2 ? <button className="btn primary" onClick={next}>{step === 0 ? 'Continue' : 'Review'} <ChevronRight size={15}/></button>
    : live
      ? (localOnly ? <button className="btn primary" onClick={savePreview}>Save local preview</button> : wallet.status === 'connected' ? <button className="btn primary" disabled={busy || !preconditions || !executable || !reviewedEconomics || reviewedEconomics !== economics.data} onClick={launchLive}>{busy ? 'Launching…' : `Launch · ${launchFeeMon ?? ''} MON fee`}</button>
        : wallet.status === 'wrong-chain' ? <button className="btn primary" onClick={() => void wallet.switchChain()}>Switch to Monad Testnet</button>
        : <button className="btn primary" onClick={() => void wallet.connect().catch(() => {})}>Connect wallet to launch</button>)
      : demo.connected ? <button className="btn primary" onClick={launchDemo}>Launch</button> : <button className="btn primary" onClick={() => demo.setConnected(true)}>Sign in to launch</button>}</div></section><aside className="rail"><div className="panel creation-preview token-preview"><div className="preview-label">ON THE BOARD</div><PairAvatars baseSymbol={form.ticker || 'TOKEN'} baseLogo={previewImage} quote={live ? selectedAsset : quoteAssets.find(asset => asset.symbol === pair.symbol)} quoteSymbol={pair.symbol} size={64}/><h3>{form.name || 'Your token'}</h3><span className="tag">{live ? CATEGORY_LABELS[selectedAsset.category] : isStock ? 'STOCK-PAIRED' : 'CRYPTO'}</span><p>{form.ticker || 'TOKEN'} · {pair.symbol} pair</p><dl className="detail-list"><dt>Supply</dt><dd>{live ? (!localOnly && config ? exactAmount(config.supply, 18, 0) : '—') : SUPPLY}</dd><dt>Graduates at</dt><dd>{live ? (thresholdDisplay !== null ? `${thresholdDisplay} ${livePair?.symbol}` : '—') : GRADUATES_AT}</dd><dt>Creator fee</dt><dd>{Number.isFinite(Number(form.creatorFee)) ? `${Number(form.creatorFee)}%` : '—'}</dd><dt>Launch fee</dt><dd>{live ? (launchFeeMon !== null ? `${launchFeeMon} MON` : '—') : LAUNCH_FEE}</dd></dl></div><div className="notice create-boundary" style={{ marginTop: 20 }}><ShieldCheck size={17}/><span>{live ? localOnly ? 'Local preview only. Your selected asset has no admitted executable quote for this venue.' : 'A real launch on Monad Testnet: your wallet signs one factory transaction that deploys the token and its bonding curve.' : 'Local DEMO draft only. No asset is minted, deployed, or submitted to any venue from this interface.'}</span></div></aside></div></>;
}

export default function CreateLaunch({ initialType }: { initialType?: string }) {
  if (initialType === 'prediction') return <CreateMarket/>;
  const type: CreationType = initialType === 'stocks' ? 'stocks' : 'crypto';
  return <TokenLaunchWizard type={type}/>;
}
