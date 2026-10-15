import test from 'node:test';import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWalletImage } from '../src/lib/media/wallet-image.ts';
import { addToWalletPayload, classifyWatchAssetError, watchAssetAction } from '../src/features/launchpad/add-to-wallet.ts';

const CIS_SRC='ipfs://QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND';
const CIS_TOKEN='0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f';
const CIS_DERIVATIVE='https://retropick.xyz/wallet/416b0da3cf5de37a329f941291a19230f6d7a45ee9572e858e6b7dc46d84f9fb.png';
const RETRO_SRC='ipfs://Qmc3ZojHMWXFkautyJvnud1YzDN3jNvPH7QWb39bYmy9aL'; // existing launch, unregistered
const FRESH_CID='QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // stand-in for a newly launched token's logo
const GATEWAY='https://gateway.pinata.cloud/ipfs/';
const RETRO_CID=RETRO_SRC.replace('ipfs://','');

const here=dirname(fileURLToPath(import.meta.url));
const appRoot=resolve(here,'..');
const manifest=JSON.parse(readFileSync(resolve(appRoot,'public','wallet','wallet-icons.manifest.json'),'utf8'));

test('registered logos (CIS) resolve to the committed content-addressed derivative',()=>{
  assert.equal(resolveWalletImage(CIS_SRC),CIS_DERIVATIVE);
});

test('unregistered IPFS logos KEEP wallet metadata through the media resolver (regression: PR #37 draft dropped them)',()=>{
  assert.equal(resolveWalletImage(RETRO_SRC),`${GATEWAY}${RETRO_CID}`); // existing launch, no registry entry
  assert.equal(resolveWalletImage(`ipfs://${FRESH_CID}`),`${GATEWAY}${FRESH_CID}`); // newly launched, unregistered
  assert.equal(resolveWalletImage(`ipfs://ipfs/${FRESH_CID}`),`${GATEWAY}${FRESH_CID}`); // ipfs://ipfs/<cid> variant
});

test('arweave logos resolve to the public arweave gateway; https artwork passes through',()=>{
  assert.equal(resolveWalletImage('ar://S4IDxnXU0NbAvlUffY00lZqmi5l6IfHspdaM1QSCxntS'),'https://arweave.net/S4IDxnXU0NbAvlUffY00lZqmi5l6IfHspdaM1QSCxntS');
  assert.equal(resolveWalletImage('https://cdn.example.com/logo.png'),'https://cdn.example.com/logo.png');
  assert.equal(resolveWalletImage(`  https://cdn.example.com/x.png  `),'https://cdn.example.com/x.png'); // Trimmed.
});

test('quick-tunnel era media rewrites to an absolute public-origin URL',()=>{
  const h='a'.repeat(64);
  assert.equal(resolveWalletImage(`https://old-tunnel.trycloudflare.com/api/media/${h}.png`),`https://retropick.xyz/api/media/${h}.png`);
});

test('invalid or wallet-unfetchable URIs drop the image field (never a broken payload)',()=>{
  assert.equal(resolveWalletImage('http://127.0.0.1:8790/api/media/ab.gif'),null); // mixed-content http
  assert.equal(resolveWalletImage('data:image/gif;base64,R0lGOD'),null);
  assert.equal(resolveWalletImage('ftp://example.com/x'),null);
  assert.equal(resolveWalletImage('not a uri'),null);
  assert.equal(resolveWalletImage(''),null);
  assert.equal(resolveWalletImage(null),null);
  assert.equal(resolveWalletImage(undefined),null);
});

test('the wallet payload carries the derivative for CIS and gateway URLs for unregistered IPFS tokens',()=>{
  assert.deepEqual(addToWalletPayload({address:CIS_TOKEN,symbol:'CIS',decimals:18,logo:CIS_SRC}),
    {type:'ERC20',options:{address:CIS_TOKEN,symbol:'CIS',decimals:18,image:CIS_DERIVATIVE}});
  assert.deepEqual(addToWalletPayload({address:'0xf8f17922599136b44e175eec9a43123c000f3366',symbol:'RETRO',decimals:18,logo:RETRO_SRC}),
    {type:'ERC20',options:{address:'0xf8f17922599136b44e175eec9a43123c000f3366',symbol:'RETRO',decimals:18,image:`${GATEWAY}${RETRO_CID}`}});
});

test('manifest integrity: every derivative file exists, is a square 256 PNG, matches its sha256 name and size cap',()=>{
  assert.ok(manifest.icons.length>0);
  for(const icon of manifest.icons){
    const file=resolve(appRoot,'public','wallet',icon.file);
    assert.ok(existsSync(file),`missing derivative ${icon.file}`);
    const bytes=readFileSync(file);
    assert.equal(bytes[0],0x89);assert.equal(bytes[1],0x50);assert.equal(bytes[2],0x4e);assert.equal(bytes[3],0x47); // PNG magic.
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert.equal(width,manifest.size);assert.equal(height,manifest.size); // Square.
    assert.equal(bytes.length,icon.bytes);
    assert.ok(bytes.length<=512*1024,'derivative within the wallet-icon size cap');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),icon.sha256,'content hash matches the content-addressed filename');
    assert.equal(icon.file,`${icon.sha256}.png`);
    assert.ok(icon.url.startsWith('https://')); // Manifest records an absolute public URL.
  }
});

test('watchAsset failure classification and state routing stay correct',()=>{
  assert.equal(classifyWatchAssetError(Object.assign(new Error('x'),{code:4001})),'rejected');
  assert.equal(classifyWatchAssetError(Object.assign(new Error('x'),{code:-32601})),'unsupported');
  assert.equal(watchAssetAction('connected'),'request');
  assert.equal(watchAssetAction('wrong-chain'),'switch-chain');
  assert.equal(watchAssetAction('disconnected'),'connect');
});
