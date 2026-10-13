import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireReferralDbLock } from '../src/lock.ts';
test('only one referral writer acquires a database; release allows restart', () => {
  const dir=mkdtempSync(join(tmpdir(),'rp-ref-lock-')); const db=join(dir,'ref.sqlite');
  try { const release=acquireReferralDbLock(db); assert.throws(()=>acquireReferralDbLock(db),/ALREADY_OWNED/); release(); acquireReferralDbLock(db)(); }
  finally { rmSync(dir,{recursive:true,force:true}); }
});
test('uncertain or invalid ownership is not silently removed', () => {
  const dir=mkdtempSync(join(tmpdir(),'rp-ref-lock-'));const db=join(dir,'ref.sqlite');
  try { writeFileSync(`${db}.lock`,'0');assert.throws(()=>acquireReferralDbLock(db),/INVALID/); }
  finally { rmSync(dir,{recursive:true,force:true}); }
});

test('a legacy PID reused after a previous boot cannot prevent recovery', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-ref-boot-'));
  const db = join(dir, 'ref.sqlite');
  try {
    writeFileSync(`${db}.lock`, String(process.pid));
    assert.throws(() => acquireReferralDbLock(db), /ALREADY_OWNED/);
    utimesSync(`${db}.lock`, 0, 0);
    acquireReferralDbLock(db)();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
