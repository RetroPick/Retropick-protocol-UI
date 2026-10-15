#!/usr/bin/env node
// Build wallet-compatible icon derivatives for launched tokens.
//
//   node scripts/wallet-icons/build.mjs
//
// Why: `wallet_watchAsset` (EIP-747) image URLs are fetched and rendered by plain wallet
// <img> clients. Creator uploads can be animated/non-square GIFs (fine for RetroPick's own
// UI) but are a rendering risk in wallets. This pipeline derives a static, square, 256x256
// palette PNG from the FIRST FRAME of the original artwork (contain-fit on a white pad —
// no crop, no redesign), names it by its own sha256 (content-addressed → immutable URL),
// and records the mapping in a generated TypeScript registry plus a public manifest.
//
// The on-chain `logo()` value is never modified; RetroPick's frontend keeps serving the
// original. Only the Add-to-Wallet payload switches to the derivative.
//
// Requirements: ffmpeg on PATH (maintenance-time tool; artifacts are committed).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..', '..');
const sourcesPath = resolve(here, 'sources.json');
const publicDir = resolve(appRoot, 'public', 'wallet');
const registryOut = resolve(appRoot, 'src', 'lib', 'media', 'wallet-icons.generated.ts');
const manifestOut = resolve(publicDir, 'wallet-icons.manifest.json');

const SIZE = 256;
const MAX_BYTES = 512 * 1024;
const IPFS_GATEWAY = process.env.WALLET_ICONS_GATEWAY ?? 'https://gateway.pinata.cloud';
const PUBLIC_ORIGIN = process.env.WALLET_ICONS_PUBLIC_ORIGIN ?? 'https://retropick.xyz';

function sourceUrl(uri) {
  const ipfs = uri.match(/^ipfs:\/\/(?:ipfs\/)?([^/?#]+.*)$/);
  if (ipfs) return `${IPFS_GATEWAY}/ipfs/${ipfs[1]}`;
  if (/^https?:\/\//.test(uri)) return uri;
  throw new Error(`unsupported wallet-icon source URI: ${uri}`);
}

function ffmpegDerivative(inputPath, outputPath) {
  // First frame → contain-fit into 256x256 on a white pad → opaque palette PNG.
  // palettegen/paletteuse quantize to <=256 colors (no dither) purely for size; the pad
  // is opaque so no transparency-index ambiguity can corrupt dark artwork regions.
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', inputPath, '-frames:v', '1', '-filter_complex',
    `[0:v]scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,` +
    `pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih)/2:color=white,format=rgb24,split[a][b];` +
    `[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=none`,
    outputPath,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
}

function pngInfo(bytes) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) throw new Error('derivative is not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

async function main() {
  const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));
  if (!Array.isArray(sources) || sources.some((s) => typeof s.source !== 'string' || !/^0x[\da-fA-F]{40}$/.test(s.token ?? ''))) {
    throw new Error('sources.json entries need string `source` URI and checksummed `token` address');
  }
  mkdirSync(publicDir, { recursive: true });
  const manifest = { size: SIZE, generatedAt: new Date().toISOString(), publicOrigin: PUBLIC_ORIGIN, icons: [] };
  const registry = {};

  for (const entry of sources) {
    const url = sourceUrl(entry.source);
    const original = Buffer.from(await fetch(url, { signal: AbortSignal.timeout(30000) }).then((r) => {
      if (!r.ok) throw new Error(`fetching ${url}: HTTP ${r.status}`);
      return r.arrayBuffer();
    }));
    const sourceHash = createHash('sha256').update(original).digest('hex');
    const tmpIn = resolve(publicDir, `.tmp-${sourceHash.slice(0, 12)}.src`);
    const tmpOut = resolve(publicDir, `.tmp-${sourceHash.slice(0, 12)}.png`);
    writeFileSync(tmpIn, original);
    try {
      ffmpegDerivative(tmpIn, tmpOut);
      const png = readFileSync(tmpOut);
      const { width, height } = pngInfo(png);
      if (width !== SIZE || height !== SIZE) throw new Error(`derivative is ${width}x${height}, expected ${SIZE}x${SIZE}`);
      if (png.length > MAX_BYTES) throw new Error(`derivative is ${png.length} bytes (cap ${MAX_BYTES})`);
      const derivativeHash = createHash('sha256').update(png).digest('hex');
      const fileName = `${derivativeHash}.png`;
      writeFileSync(resolve(publicDir, fileName), png);
      registry[entry.source] = `/wallet/${fileName}`;
      manifest.icons.push({ source: entry.source, token: entry.token, note: entry.note ?? null, sourceHash, sourceBytes: original.length, file: fileName, sha256: derivativeHash, bytes: png.length, width, height, url: `${PUBLIC_ORIGIN}/wallet/${fileName}` });
      console.log(`${entry.source} -> /wallet/${fileName} (${png.length} B, ${width}x${height})`);
    } finally {
      for (const tmp of [tmpIn, tmpOut]) if (existsSync(tmp)) execFileSync('rm', ['-f', tmp]);
    }
  }

  writeFileSync(manifestOut, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(registryOut,
    `// GENERATED by scripts/wallet-icons/build.mjs — do not edit by hand.\n` +
    `// Maps an on-chain logo URI to its committed wallet-derivative asset (square 256x256\n` +
    `// palette PNG named by content sha256). Keep in sync via the build script.\n` +
    `export const WALLET_ICON_DERIVATIVES: Record<string, string> = ${JSON.stringify(registry, null, 2)};\n`);
  console.log(`manifest: public/wallet/wallet-icons.manifest.json | registry: src/lib/media/wallet-icons.generated.ts`);
}

await main();
