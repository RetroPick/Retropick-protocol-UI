export const CHAIN_ID = 10143 as const;
/** Hard cap at the service edge. The client downscales to ~256 KiB before uploading; this is the denial ceiling. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
/** The deployed RetroPickLaunchDeployerV2 caps the onchain logo string at 512 bytes; a returned URI must fit. */
export const MAX_LOGO_BYTES = 512;
export const UPLOADS_PER_MINUTE = 12;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

export type SniffedType = { mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; ext: 'png' | 'jpg' | 'gif' | 'webp' };

/** Content is typed by its magic bytes only; client-declared filenames and content types are never trusted. */
export function sniffImage(bytes: Uint8Array): SniffedType {
  const starts = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return { mime: 'image/png', ext: 'png' };
  if (starts(0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', ext: 'jpg' };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { mime: 'image/gif', ext: 'gif' };
  // RIFF<size:4>WEBP
  if (bytes.length >= 12 && starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { mime: 'image/webp', ext: 'webp' };
  throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE');
}

/** CIDv0 (base58, 46 chars) or CIDv1 raw sha2-256 (base32, 59 chars). */
export function isCid(value: string): boolean {
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(value) || /^b[a-z2-7]{58}$/.test(value);
}
