import test from 'node:test';import assert from 'node:assert/strict';
import { resolveMediaSrc, ipfsGatewayCandidates } from '../src/lib/media/resolve.ts';
import { uploadLogo } from '../src/lib/media/upload.ts';
import { isLogoUri } from '../src/lib/live/create-validation.ts';

const CID='QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

test('resolveMediaSrc maps onchain logo URIs to browser-loadable URLs',()=>{
  assert.equal(resolveMediaSrc(''),null);assert.equal(resolveMediaSrc(null),null);assert.equal(resolveMediaSrc(undefined),null);
  assert.equal(resolveMediaSrc('https://example.com/logo.png'),'https://example.com/logo.png');
  assert.equal(resolveMediaSrc('http://127.0.0.1:8790/api/media/abcd.png'),'http://127.0.0.1:8790/api/media/abcd.png'); // Local media-service URIs pass through.
  assert.equal(resolveMediaSrc(`ipfs://${CID}`),`https://ipfs.io/ipfs/${CID}`);
  assert.equal(resolveMediaSrc('ar://S4IDxnXU0NbAvlUffY00lZqmi5l6IfHspdaM1QSCxntU'),'https://arweave.net/S4IDxnXU0NbAvlUffY00lZqmi5l6IfHspdaM1QSCxntU');
  assert.equal(resolveMediaSrc('  https://example.com/x.png  '),'https://example.com/x.png'); // Trimmed.
  assert.equal(resolveMediaSrc('ftp://example.com/x'),null);
  assert.equal(resolveMediaSrc('data:image/png;base64,AAAA'),null);
  assert.equal(resolveMediaSrc('not a uri'),null);
  const h='4121ffd23a8aaf5f09a457969ad191320a3b4eb6079199837347df571eade19b';
  assert.equal(resolveMediaSrc(`https://old-rotated-name.trycloudflare.com/api/media/${h}.webp`),`/api/media/${h}.webp`); // Rotated quick-tunnel media → same-origin.
  assert.equal(resolveMediaSrc('https://evil.trycloudflare.com/other/x.png'),'https://evil.trycloudflare.com/other/x.png'); // Only content-addressed media paths are rewritten.
});

test('ipfs gateway candidates retry once on the fallback gateway',()=>{
  const primary=`https://ipfs.io/ipfs/${CID}`;
  assert.deepEqual(ipfsGatewayCandidates(primary),[primary,`https://dweb.link/ipfs/${CID}`]);
  const plain='https://example.com/logo.png';
  assert.deepEqual(ipfsGatewayCandidates(plain),[plain]);
  const alreadyFallback=`https://dweb.link/ipfs/${CID}`;
  assert.deepEqual(ipfsGatewayCandidates(alreadyFallback),[alreadyFallback]); // No self-duplicate when the fallback already is primary.
});

test('isLogoUri admits https, http (local media service), ipfs and ar with hostnames only',()=>{
  for(const ok of ['','https://example.com/l.png','http://127.0.0.1:8790/api/media/ab.png',`ipfs://${CID}`,'ar://S4IDxnXU0NbAvlUffY00lZqmi5l6IfHspdaM1QSCxntU'])assert.equal(isLogoUri(ok),true,ok);
  for(const bad of ['ftp://example.com/x','https://user:pass@example.com/l.png','ipfs://','javascript:alert(1)','data:image/png;base64,AAAA','just text'])assert.equal(isLogoUri(bad),false,bad);
});

test('uploadLogo maps service errors to friendly messages and returns the uri on success',async()=>{
  const originalFetch=globalThis.fetch;const blob=new Blob([new Uint8Array([0x89,0x50,0x4e,0x47])]);
  try{
    globalThis.fetch=async()=>Response.json({error:'UNSUPPORTED_MEDIA_TYPE'},{status:415});
    await assert.rejects(uploadLogo(blob),/image type is not supported/);
    globalThis.fetch=async()=>Response.json({error:'RATE_LIMITED'},{status:429});
    await assert.rejects(uploadLogo(blob),/Too many uploads/);
    globalThis.fetch=async()=>Response.json({error:'REQUEST_TOO_LARGE'},{status:413});
    await assert.rejects(uploadLogo(blob),/too large/);
    globalThis.fetch=async()=>{throw new TypeError('network down');};
    await assert.rejects(uploadLogo(blob),/unreachable.*paste a logo URI/);
    globalThis.fetch=async(_input,init)=>{ // Success must post multipart with a file field.
      const form=init.body;assert.ok(form instanceof FormData);assert.ok(form.get('file') instanceof File);
      return Response.json({uri:`ipfs://${CID}`,https:`https://ipfs.io/ipfs/${CID}`,hash:'a'.repeat(64),bytes:4,mime:'image/png',mode:'pinata'});
    };
    const result=await uploadLogo(blob);
    assert.equal(result.uri,`ipfs://${CID}`);assert.equal(result.mode,'pinata');
  }finally{globalThis.fetch=originalFetch;}
});
