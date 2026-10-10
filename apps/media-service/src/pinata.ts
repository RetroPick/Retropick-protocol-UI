import { ApiError, isCid } from './model.ts';

const PIN_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/** Pins bytes via the Pinata v2 REST API (Bearer JWT). The JWT never leaves the server. */
export async function pinFile(jwt: string, bytes: Uint8Array<ArrayBuffer>, name: string, mime: string, fetchImpl: typeof fetch = fetch): Promise<{ cid: string }> {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), name);
  form.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));
  let response: Response;
  try { response = await fetchImpl(PIN_ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: form }); }
  catch { throw new ApiError(502, 'PIN_UNREACHABLE'); }
  if (!response.ok) throw new ApiError(502, 'PIN_REJECTED');
  const value = await response.json().catch(() => null) as { IpfsHash?: unknown } | null;
  const cid = typeof value?.IpfsHash === 'string' ? value.IpfsHash : '';
  if (!isCid(cid)) throw new ApiError(502, 'PIN_INVALID_CID');
  return { cid };
}
