import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { ApiError, MAX_LOGO_BYTES, MAX_UPLOAD_BYTES, UPLOADS_PER_MINUTE, sniffImage, type SniffedType } from './model.ts';
import type { MediaStore } from './store.ts';
import { pinFile } from './pinata.ts';

const PREFIX = '/api/media';
const KEY_PATTERN = /^\/api\/media\/([0-9a-f]{64}\.(png|jpg|gif|webp))$/;
const MIME_BY_EXT: Record<string, SniffedType['mime']> = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

export type UploadResult = { uri: string; https: string | null; hash: string; bytes: number; mime: SniffedType['mime']; mode: 'pinata' | 'local' };

async function readBody(req: IncomingMessage, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  let bytes = 0; const parts: Buffer[] = [];
  for await (const chunk of req) { const part = Buffer.from(chunk); bytes += part.length; if (bytes > maxBytes) throw new ApiError(413, 'REQUEST_TOO_LARGE'); parts.push(part); }
  // Copy into a plain Uint8Array so the body is a BodyInit-compatible ArrayBuffer view.
  return new Uint8Array(Buffer.concat(parts));
}

export function createMediaApp({ store, origins, pinataJwt, publicBase, maxBytes = MAX_UPLOAD_BYTES, fetchImpl = fetch, clock = Date.now }: {
  store: MediaStore; origins: string[]; pinataJwt: string | null; publicBase: string;
  maxBytes?: number; fetchImpl?: typeof fetch; clock?: () => number;
}) {
  const rates = new Map<string, { count: number; until: number }>();
  return createServer(async (req, res) => {
    const sendJson = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
    try {
      const requestUrl = new URL(req.url ?? '/', 'http://media.local'); const path = requestUrl.pathname;
      if (requestUrl.search) throw new ApiError(400, 'INVALID_PARAMETERS');

      if (path === `${PREFIX}/health`) {
        if (req.method !== 'GET') throw new ApiError(405, 'METHOD_NOT_ALLOWED');
        sendJson(200, { chainId: 10143, mediaOnly: true, mode: pinataJwt ? 'pinata' : 'local' });
        return;
      }

      // Immutable content-addressed files; open to any reader (plain <img> loads, no CORS needed).
      const fileMatch = path.match(KEY_PATTERN);
      if (fileMatch) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new ApiError(405, 'METHOD_NOT_ALLOWED');
        const bytes = await store.get(fileMatch[1]);
        res.writeHead(200, {
          'Content-Type': MIME_BY_EXT[fileMatch[2]], 'Content-Length': bytes.length,
          'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        });
        res.end(req.method === 'HEAD' ? undefined : bytes);
        return;
      }

      if (path !== `${PREFIX}/upload`) throw new ApiError(404, 'NOT_FOUND');
      if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED');
      const origin = req.headers.origin;
      if (typeof origin !== 'string' || !origins.includes(origin)) throw new ApiError(403, 'INVALID_ORIGIN');

      const now = clock(); const rateKey = req.socket.remoteAddress ?? 'unknown'; let rate = rates.get(rateKey);
      if (!rate || rate.until <= now) { rate = { count: 0, until: now + 60000 }; rates.set(rateKey, rate); }
      if (++rate.count > UPLOADS_PER_MINUTE) throw new ApiError(429, 'RATE_LIMITED');
      if (rates.size > 1000) for (const [key, value] of rates) if (value.until <= now) rates.delete(key);

      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.startsWith('multipart/form-data')) throw new ApiError(415, 'MULTIPART_REQUIRED');
      const raw = await readBody(req, maxBytes);
      let form: FormData;
      try { form = await new Request('http://media.local/upload', { method: 'POST', headers: { 'content-type': contentType }, body: raw }).formData(); }
      catch { throw new ApiError(400, 'INVALID_MULTIPART'); }
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0) throw new ApiError(400, 'FILE_REQUIRED');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sniffed = sniffImage(bytes);
      const hash = createHash('sha256').update(bytes).digest('hex');

      let result: UploadResult;
      if (pinataJwt) {
        const { cid } = await pinFile(pinataJwt, bytes, `retropick-${hash.slice(0, 8)}.${sniffed.ext}`, sniffed.mime, fetchImpl);
        result = { uri: `ipfs://${cid}`, https: `https://ipfs.io/ipfs/${cid}`, hash, bytes: bytes.length, mime: sniffed.mime, mode: 'pinata' };
      } else {
        const key = await store.put(hash, sniffed.ext, bytes);
        result = { uri: `${publicBase.replace(/\/+$/, '')}${PREFIX}/${key}`, https: null, hash, bytes: bytes.length, mime: sniffed.mime, mode: 'local' };
      }
      if (result.uri.length > MAX_LOGO_BYTES) throw new ApiError(500, 'LOGO_URI_TOO_LONG');
      sendJson(200, result);
    } catch (cause) { sendJson(cause instanceof ApiError ? cause.status : 503, { error: cause instanceof ApiError ? cause.code : 'SERVICE_UNAVAILABLE' }); }
  });
}
