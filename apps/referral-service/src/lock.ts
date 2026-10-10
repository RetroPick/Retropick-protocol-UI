import { closeSync, openSync, readFileSync, rmSync, statSync, writeSync } from 'node:fs';

/** One attribution writer per SQLite database. Fail closed on uncertain ownership. */
export function acquireReferralDbLock(db: string): () => void {
  const path = `${db}.lock`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fd = openSync(path, 'wx', 0o600);
      try { writeSync(fd, String(process.pid)); } finally { closeSync(fd); }
      return () => {
        try { if (readFileSync(path, 'utf8') === String(process.pid)) rmSync(path); }
        catch { /* Lock already released. */ }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const before = statSync(path);
      const owner = Number(readFileSync(path, 'utf8'));
      if (!Number.isSafeInteger(owner) || owner <= 0) throw Error('REFERRAL_DB_LOCK_INVALID');
      try { process.kill(owner, 0); throw Error('REFERRAL_DB_ALREADY_OWNED'); }
      catch (cause) {
        if ((cause as NodeJS.ErrnoException).code !== 'ESRCH') throw cause;
      }
      const after = statSync(path);
      if (before.ino === after.ino && before.mtimeMs === after.mtimeMs) rmSync(path);
    }
  }
  throw Error('REFERRAL_DB_ALREADY_OWNED');
}
