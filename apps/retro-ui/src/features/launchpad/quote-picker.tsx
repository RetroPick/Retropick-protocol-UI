import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ASSET_CATEGORIES, CATEGORY_LABELS, categoryCounts, customQuote, matchesQuoteSearch, quoteAssets, type AssetCategory, type QuoteAsset } from '@retropick/launchpad-sdk/quote-assets';
import type { AdmittedQuote, VenueId } from '@retropick/launchpad-sdk/registry';
import { AssetLogo } from '@/components/trading/pair-identity';
import './quote-picker.css';
export const STATUS_LABELS = { LIVE_TESTNET: 'Live testnet', TESTNET_REPRESENTATION: 'Testnet representation', REFERENCE_ONLY: 'Reference only', DISABLED: 'Disabled' };
export type PickerState = { search: string; category: AssetCategory | 'ALL' };
const counts = categoryCounts();
export function QuotePicker({ selected, onSelect, state, onState, quotes, venue, checking }: { selected: QuoteAsset; onSelect: (asset: QuoteAsset) => void; state: PickerState; onState: (state: PickerState) => void; quotes: readonly AdmittedQuote[]; venue: VenueId; checking: boolean }) {
  const [limit, setLimit] = useState(40);
  const [customAddress, setCustomAddress] = useState('');
  const [customError, setCustomError] = useState('');
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const results = useMemo(() => quoteAssets.filter(asset => (state.category === 'ALL' || asset.category === state.category) && matchesQuoteSearch(asset, state.search)), [state]);
  const shown = results.slice(0, limit);
  const update = (patch: Partial<PickerState>) => { setLimit(40); onState({ ...state, ...patch }); };
  const select = (asset: QuoteAsset) => { if (asset.status !== 'DISABLED') onSelect(asset); };
  const key = (event: KeyboardEvent, index: number) => {
    const enabled = shown.map((asset, i) => asset.status === 'DISABLED' ? -1 : i).filter(i => i >= 0);
    const pos = enabled.indexOf(index);
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? enabled[(pos + 1) % enabled.length] : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? enabled[(pos - 1 + enabled.length) % enabled.length] : event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : undefined;
    if (next === undefined) return; event.preventDefault(); select(shown[next]); buttons.current[next]?.focus();
  };
  const selectedInResults = shown.some(asset => asset.id === selected.id && asset.status !== 'DISABLED');
  return <section className="rp-quote-picker" aria-label="Quote asset catalog">
    <div className="rp-quote-heading"><h3>Paired with</h3><span>{quoteAssets.length} curated assets</span></div>
    <div className="rp-quote-categories" role="group" aria-label="Quote categories"><button type="button" aria-pressed={state.category === 'ALL'} onClick={() => update({ category: 'ALL' })}>All <small>{quoteAssets.length}</small></button>{ASSET_CATEGORIES.map(category => <button type="button" key={category} aria-pressed={state.category === category} onClick={() => update({ category })}>{CATEGORY_LABELS[category]} <small>{counts[category]}</small></button>)}</div>
    <div className="rp-quote-search"><input aria-label="Search quote assets" placeholder="Search symbol, name or address" value={state.search} onChange={event => update({ search: event.target.value })}/>{state.search && <button type="button" className="text-link" onClick={() => update({ search: '' })}>Clear search</button>}</div>
    <p className="rp-quote-caption">Select a live quote to launch, or a reference to preview locally. Company references do not represent equity. No issuer partnership is implied.</p>
    {state.category === 'CUSTOM' && <div className="rp-custom-quote"><label className="field"><span>Custom Monad Testnet address (optional)</span><input aria-label="Custom quote address" value={customAddress} onChange={event => setCustomAddress(event.target.value)} placeholder="0x…"/></label><button type="button" className="btn" onClick={() => { try { const asset = customQuote(customAddress.trim() || undefined); onSelect(asset); setCustomError(''); } catch { setCustomError('Enter a 20-byte ERC-20 address, or leave it empty for a local reference.'); } }}>Inspect custom quote</button>{customError && <p role="alert">{customError}</p>}</div>}
    <div className="rp-quote-grid" role="radiogroup" aria-label="Quote asset" aria-busy={checking}>{shown.map((asset, index) => {
      const admitted = asset.monadTestnetAddress && quotes.find(q => q.address.toLowerCase() === asset.monadTestnetAddress!.toLowerCase() && q.venue === venue);
      const executable = !!admitted && asset.status !== 'DISABLED';
      const checked = selected.id === asset.id;
      return <button type="button" role="radio" aria-checked={checked} aria-disabled={asset.status === 'DISABLED'} tabIndex={checked || (!selectedInResults && index === shown.findIndex(a => a.status !== 'DISABLED')) ? 0 : -1} ref={node => { buttons.current[index] = node; }} key={asset.id} data-asset-id={asset.id} className={`rp-quote-card${checked ? ' is-selected' : ''}`} onClick={() => select(asset)} onKeyDown={event => key(event, index)} title={asset.unavailableReason}>
        <AssetLogo asset={asset} size={32}/><span className="rp-quote-card-name"><strong>{asset.symbol}</strong><small>{asset.name}</small></span><span className={`rp-quote-status${executable ? ' is-live' : ''}`}>{STATUS_LABELS[asset.status]}{!executable && asset.status !== 'DISABLED' ? ' · Preview' : ''}</span><small className="rp-quote-network">{asset.monadTestnetAddress ? `Monad Testnet · ${asset.monadTestnetAddress === '0x0000000000000000000000000000000000000000' ? 'native MON' : `${asset.monadTestnetAddress.slice(0, 6)}…${asset.monadTestnetAddress.slice(-4)}`}` : asset.reference.network}</small>
      </button>;
    })}</div>
    {!results.length && state.category !== 'CUSTOM' && <p role="status" className="rp-quote-caption">No catalog assets match this search.</p>}
    {results.length > shown.length && <button type="button" className="btn ghost" onClick={() => setLimit(value => value + 40)}>Show more assets ({results.length - shown.length})</button>}
    <div className="rp-quote-selected" aria-live="polite"><AssetLogo asset={selected}/><div><strong>{selected.name}</strong><p>{selected.unavailableReason}</p><p>{checking ? 'Checking current quote policy…' : quotes.some(q => q.address.toLowerCase() === selected.monadTestnetAddress?.toLowerCase() && q.venue === venue) && selected.status !== 'DISABLED' ? 'Currently admitted for this venue on Monad Testnet.' : 'No verified admission for this venue. Local preview only.'}</p>{selected.monadTestnetAddress && <code>{selected.monadTestnetAddress}</code>}<small>Identity checked {selected.verification.checkedAt} · <a href={selected.verification.source} target="_blank" rel="noreferrer">Source</a> · {selected.logo.attribution}</small></div></div>
  </section>;
}
