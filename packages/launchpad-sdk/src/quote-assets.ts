import { z } from 'zod';
import { quoteAssetData } from './quote-assets-data.ts';

export const ASSET_CATEGORIES = ['CRYPTO', 'STOCKS', 'PRIVATE', 'CURRENCIES', 'COMMODITIES', 'CUSTOM'] as const;
export const CATEGORY_LABELS: Record<AssetCategory, string> = { CRYPTO: 'Crypto', STOCKS: 'Stocks & ETFs', PRIVATE: 'Private companies', CURRENCIES: 'Currencies', COMMODITIES: 'Commodities', CUSTOM: 'Custom' };
export type AssetCategory = typeof ASSET_CATEGORIES[number];
export const QUOTE_STATUSES = ['LIVE_TESTNET', 'TESTNET_REPRESENTATION', 'REFERENCE_ONLY', 'DISABLED'] as const;
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
export const quoteAssetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), symbol: z.string().min(1), name: z.string().min(1), category: z.enum(ASSET_CATEGORIES),
  logo: z.object({ src: z.string().startsWith('/quote-assets/').nullable(), source: z.string().url().nullable(), license: z.string().min(1), attribution: z.string().min(1) }),
  issuer: z.string().nullable(), source: z.string().url(),
  reference: z.object({ network: z.string().min(1), address: z.string().nullable() }),
  monadTestnetAddress: address.nullable(), decimals: z.number().int().min(0).max(255).nullable(),
  status: z.enum(QUOTE_STATUSES), venues: z.array(z.union([z.literal(0), z.literal(1)])),
  oracle: z.object({ id: z.string(), source: z.string().url(), maxAgeSeconds: z.number().int().positive() }).nullable(),
  verification: z.object({ checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), source: z.string().url(), scope: z.string().min(1) }),
  unavailableReason: z.string().min(1),
}).superRefine((asset, ctx) => {
  if (asset.status === 'LIVE_TESTNET' && (!asset.monadTestnetAddress || asset.decimals === null)) ctx.addIssue({ code: 'custom', message: 'Live assets require a verified testnet identity.' });
  if (['REFERENCE_ONLY', 'DISABLED'].includes(asset.status) && (asset.monadTestnetAddress || asset.venues.length)) ctx.addIssue({ code: 'custom', message: 'References cannot claim testnet deployment or venue support.' });
  if (!!asset.logo.src !== !!asset.logo.source) ctx.addIssue({ code: 'custom', message: 'Artwork requires provenance.' });
});
export type QuoteAsset = z.infer<typeof quoteAssetSchema>;
export const quoteCatalogSchema = z.array(quoteAssetSchema).superRefine((assets, ctx) => {
  for (const field of ['id', 'monadTestnetAddress'] as const) {
    const seen = new Set<string>();
    assets.forEach(asset => { const value = asset[field]?.toLowerCase(); if (!value) return; if (seen.has(value)) ctx.addIssue({ code: 'custom', message: `Duplicate ${field}: ${value}` }); seen.add(value); });
  }
});
/** Metadata never grants admission. Only readLaunchPreconditions authorizes a quote/venue. */
export const quoteAssets: readonly QuoteAsset[] = quoteCatalogSchema.parse(quoteAssetData);
export const catalogVersion = '2026-10-13.1';
const byId = new Map(quoteAssets.map(asset => [asset.id, asset]));
const byMonadAddress = new Map(quoteAssets.filter(asset => asset.monadTestnetAddress).map(asset => [asset.monadTestnetAddress!.toLowerCase(), asset]));
export function quoteAssetById(id: string): QuoteAsset | undefined { return byId.get(id); }
export function quoteAssetByAddress(chainId: number, address: string | null | undefined): QuoteAsset | undefined { return chainId === 10143 && address ? byMonadAddress.get(address.toLowerCase()) : undefined; }
export function quoteKey(chainId: number, address: string): string { return `${chainId}:${address.toLowerCase()}`; }
export function matchesQuoteSearch(asset: QuoteAsset, query: string): boolean { const q = query.trim().toLowerCase(); return !q || [asset.symbol, asset.name, asset.id, asset.monadTestnetAddress, asset.reference.address].some(value => value?.toLowerCase().includes(q)); }
export function categoryCounts(assets: readonly QuoteAsset[] = quoteAssets): Record<AssetCategory, number> { return Object.fromEntries(ASSET_CATEGORIES.map(category => [category, assets.filter(asset => asset.category === category).length])) as Record<AssetCategory, number>; }
export function customQuote(addressValue?: string, symbol = 'CUSTOM'): QuoteAsset {
  const normalized = addressValue ? address.parse(addressValue).toLowerCase() : null;
  return { id: normalized ? `custom-10143-${normalized}` : 'custom-local-reference', symbol, name: normalized ? 'Custom Monad Testnet quote' : 'Custom asset reference', category: 'CUSTOM', logo: { src: null, source: null, license: 'Original text fallback', attribution: 'RetroPick' }, issuer: null, source: 'https://github.com/RetroPick/retropick-protocol', reference: { network: normalized ? 'Monad Testnet (unverified)' : 'Offchain', address: normalized }, monadTestnetAddress: normalized, decimals: null, status: 'TESTNET_REPRESENTATION', venues: [], oracle: null, verification: { checkedAt: '2026-10-13', source: 'https://github.com/RetroPick/retropick-protocol', scope: 'User input; identity and admission not verified' }, unavailableReason: 'Custom reference only until its contract identity and venue admission are verified onchain.' };
}
