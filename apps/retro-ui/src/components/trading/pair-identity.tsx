import { useEffect, useState, type CSSProperties } from 'react';
import { quoteAssetByAddress, type QuoteAsset } from '@retropick/launchpad-sdk/quote-assets';
import { TokenImage } from '@/components/product/token-image';
import './pair-identity.css';

/** Fixed-size artwork boundary: either image can fail without shifting the pair. */
export function AssetLogo({ asset, symbol, size = 28 }: { asset?: QuoteAsset; symbol?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = asset?.logo.src;
  useEffect(() => setFailed(false), [src]);
  const label = asset?.symbol ?? symbol ?? '?';
  return <span className="rp-asset-logo" style={{ '--asset-size': `${size}px` } as CSSProperties} data-logo-kind="quote" data-asset-id={asset?.id} title={asset?.name ?? label}>
    {src && !failed ? <img src={src} alt={`${label} quote logo`} width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)}/> : <span role="img" aria-label={`${label} quote logo fallback`}>{label.slice(0, 2)}</span>}
  </span>;
}
export function PairAvatars({ baseSymbol, baseLogo, quote, quoteSymbol, size = 32 }: { baseSymbol: string; baseLogo?: string | null; quote?: QuoteAsset; quoteSymbol?: string; size?: number }) {
  return <span className="rp-pair-avatars" style={{ '--asset-size': `${size}px` } as CSSProperties}>
    <span className="rp-base-logo" data-logo-kind="base"><TokenImage src={baseLogo} alt={`${baseSymbol} token logo`} width={size} height={size} fallback={<span role="img" aria-label={`${baseSymbol} token logo fallback`}>{baseSymbol.slice(0, 2)}</span>}/></span>
    <AssetLogo asset={quote} symbol={quoteSymbol} size={Math.round(size * .72)}/>
  </span>;
}
export function PairIdentity({ name, symbol, logo, quoteAddress, quoteSymbol, quote, size = 32, compact = false }: { name: string; symbol: string; logo?: string | null; quoteAddress?: string | null; quoteSymbol: string; quote?: QuoteAsset; size?: number; compact?: boolean }) {
  const asset = quote ?? quoteAssetByAddress(10143, quoteAddress);
  return <span className="rp-pair-identity" data-testid="pair-identity"><PairAvatars baseSymbol={symbol} baseLogo={logo} quote={asset} quoteSymbol={quoteSymbol} size={size}/><span><strong>{compact ? `${symbol} / ${quoteSymbol}` : name}</strong><small>{compact ? `${name} · ${asset?.name ?? quoteSymbol}` : `${symbol} / ${quoteSymbol}`}</small></span></span>;
}
