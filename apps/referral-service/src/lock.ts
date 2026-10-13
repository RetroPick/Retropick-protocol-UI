import { existsSync, statSync, readFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/** Kernel-backed writer exclusion. Never unlink the guard: its inode owns the lock. */
export function acquireReferralDbLock(file: string): () => void {
  const guard = new DatabaseSync(`${file}.writer-lock.sqlite`);
  try {
    guard.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE');
    // Upgrade only after an old writer exits. A legacy PID can be reused as a
    // process OR thread after reboot; kill(pid, 0) alone is not ownership proof.
    const legacy = `${file}.lock`;
    if (existsSync(legacy)) {
      const previous = statSync(legacy);
      const owner = Number(readFileSync(legacy, 'utf8'));
      let bootMs = 0;
      try { bootMs = Number(readFileSync('/proc/stat', 'utf8').match(/^btime (\d+)$/m)?.[1] ?? 0) * 1000; } catch { /* non-Linux: fail closed for a live legacy owner */ }
      let alive = false;
      try { if (Number.isSafeInteger(owner) && owner > 0) { process.kill(owner, 0); alive = true; } } catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
      if (alive && previous.mtimeMs >= bootMs) throw Error(`Legacy referral writer ${owner} is still active; stop it before upgrading.`);
      if (!Number.isSafeInteger(owner) || owner <= 0) throw Error('REFERRAL_DB_LOCK_INVALID');
      const current = statSync(legacy);
      if (current.ino !== previous.ino || current.mtimeMs !== previous.mtimeMs) throw Error('Legacy writer lock changed during upgrade.');
      rmSync(legacy);
    }
  } catch (cause) {
    guard.close();
    if (cause instanceof Error && cause.message === 'REFERRAL_DB_LOCK_INVALID') throw cause;
    throw Error(`REFERRAL_DB_ALREADY_OWNED: cannot acquire writer for ${file}`, { cause });
  }
  let released = false;
  return () => { if (!released) { released = true; guard.close(); } };
}
