import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMediaApp } from './app.ts';
import { MediaStore } from './store.ts';

const origins = (process.env.MEDIA_ORIGIN ?? 'http://127.0.0.1:3000').split(',').map((value) => value.trim()).filter(Boolean);
if (!origins.length) throw Error('MEDIA_ORIGIN must list at least one allowed browser origin');
const production = process.env.NODE_ENV === 'production';
if (production && origins.some((origin) => !origin.startsWith('https://'))) throw Error('Production MEDIA_ORIGIN requires HTTPS origins');
const port = Number(process.env.MEDIA_PORT ?? 8790);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid MEDIA_PORT');
const dir = resolve(process.env.MEDIA_DIR ?? '.data/media'); mkdirSync(dir, { recursive: true });
const pinataJwt = process.env.PINATA_JWT?.trim() || null;
const publicBase = (process.env.MEDIA_PUBLIC_BASE ?? `http://127.0.0.1:${port}`).replace(/\/+$/, '');
const server = createMediaApp({ store: new MediaStore(dir), origins, pinataJwt, publicBase });
server.listen(port, '127.0.0.1', () => console.log(`Media service listening on ${port} (mode: ${pinataJwt ? 'pinata' : 'local'})`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGINT', stop); process.on('SIGTERM', stop);
