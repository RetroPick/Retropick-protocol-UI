import test from 'node:test';import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWalletImage } from '../src/lib/media/wallet-image.ts';
import { addToWalletPayload, classifyWatchAssetError, watchAssetAction } from '../src/features/launchpad/add-to-wallet.ts';

const CIS_SRC='ipfs://QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND';
const CIS_TOKEN='0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f';
const CID='QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

const here=dirname(fileURLToPath(import.meta.url));
const appRoot=resolve(here,'..');
const manifest=JSON.parse(readFileSync(resolve(appRoot,'public','wallet','wallet-icons.manifest.json'),'utf8'));

test('registered logos resolve to the committed content-addressed derivative',()=>{
  const url=resolveWalletImage(CIS_SRC);
  assert.equal(url,'https://retropick.xyz/wallet/416b0da3cf5de37a329f941291a19230f6d7a45ee9572e858e6b7dc46d84f9fb.png');
  assert.ok(url.startsWith('https://')); // Wallets get an absolute fetchable URL.
});

test('unregistered sources keep the old rule: https passes, everything else drops',()=>{
  assert.equal(resolveWalletImage(`https://gateway.pinata.cloud/ipfs/${CID}`),`https://gateway.pinata.cloud/ipfs/${CID}`);
  assert.equal(resolveWalletImage(`ipfs://${CID}`),null); // Unregistered ipfs:// never reaches a wallet.
  assert.equal(resolveWalletImage('http://127.0.0.1:8790/api/media/ab.gif'),null);
  assert.equal(resolveWalletImage(''),null);
  assert.equal(resolveWalletImage(null),null);
  assert.equal(resolveWalletImage(undefined),null);
});

test('the wallet payload for CIS carries the derivative image',()=>{
  const payload=addToWalletPayload({address:CIS_TOKEN,symbol:'CIS',decimals:18,logo:CIS_SRC});
  assert.deepEqual(payload,{type:'ERC20',options:{address:CIS_TOKEN,symbol:'CIS',decimals:18,image:'https://retropick.xyz/wallet/416b0da3cf5de37a329f941291a19230f6d7a45ee9572e858e6b7dc46d84f9fb.png'}});
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
