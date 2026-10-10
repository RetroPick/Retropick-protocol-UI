import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ApiError } from './model.ts';

/** Flat content-addressed store: one immutable file per sha256, no database. */
export class MediaStore {
  private readonly directory: string;
  constructor(directory: string) { this.directory = resolve(directory); mkdirSync(this.directory, { recursive: true }); }

  async put(hash: string, ext: string, bytes: Uint8Array): Promise<string> {
    const key = `${hash}.${ext}`;
    await writeFile(join(this.directory, key), bytes);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    if (!/^[0-9a-f]{64}\.(png|jpg|gif|webp)$/.test(key)) throw new ApiError(404, 'NOT_FOUND');
    try { return await readFile(join(this.directory, key)); } catch { throw new ApiError(404, 'NOT_FOUND'); }
  }
}
