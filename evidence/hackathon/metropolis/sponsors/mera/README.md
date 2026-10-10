# Sponsor Qualification Report — Mera (Passkey PRF)

Sponsor: Mera (Category Labs)
Track: bounty "One Passkey, Many Keys"
Prize: sponsor bounty
Branch: `feat/metropolis-mera-prf` (base `main` post-baseline)
Source SHA: branch HEAD
SDK version: `@category-labs/mera` 0.2.0 (npm; API read from the shipped tarball source)
Network: n/a (client-side WebAuthn; works in demo and live modes)

## Integration status

`LOCAL_TEST_VERIFIED` + `BROWSER_E2E_VERIFIED` (mount / tamper / handled-failure states).
Full PRF happy path requires a real platform authenticator — operator manual evidence
pending (steps below). Feature is live in `apps/retro-ui` Earn hub → Vault tab.

## Existing capabilities

None previously (greenfield sponsor).

## Changes implemented

- `src/lib/vault/strategy-vault.ts` — versioned plaintext schema (5 entry kinds, hard
  bounds: 120-char titles, 8,000-char bodies, 64 entries, id pattern), localStorage
  persistence with tamper detection at read through the SDK's real `parseSecretVault`,
  friendly MeraError mapping, buffer-zeroing hygiene. No custom cryptography.
- `src/features/earn/strategy-vault.tsx` — Vault tab UI: create-with-new-passkey,
  unlock (assertion restricted to the vault's credential), entry CRUD where **every save
  re-encrypts through a fresh passkey assertion with a fresh PRF salt** (public SDK path
  only), lock (zeroes in-memory plaintext), export/import backup JSON for cross-device
  use with a synced passkey, corrupt-vault banner with recovery path, and visible
  disclosures: unlocking never grants spending authority; a lost passkey without a synced
  copy is unrecoverable.
- Earn hub wiring (live + demo hubs share the component), vault styles, `test:vault`
  script, 7 unit tests, 3 fixture e2e specs.

## Sponsor requirements

See `capability-check.json` — all requirements implemented per the SDK's real API
(tarball inspected; no invented methods).

## Test results

`test-results.json`. Unit 7/0; fixture e2e includes the 3 new specs across the viewport
matrix; encrypted-at-rest asserted (stored JSON never contains plaintext).

## Onchain evidence

n/a (deliberately non-chain; the vault is a genuinely non-wallet passkey use).

## Browser evidence

`evidence/platform/frontend/browser-validation/20261010T212944Z-fixture-vault-dev4/`
(dev iteration) + the full `mera-stage4` run referenced in test-results.

## Security assessment

- All cryptography inside @category-labs/mera (WebAuthn PRF → HKDF-SHA-256 → AES-256-GCM
  with internal nonces; SDK zeroes PRF outputs).
- No plaintext or keys persisted; in-memory plaintext wiped on lock; export contains only
  the encrypted vault.
- Fail-closed schema validation on decrypt; tampered storage detected at read.
- No spending authority: the vault cannot sign anything; wallet flows unchanged.

## External blockers / limitations

- This headless chromium build exposes no WebAuthn virtual-authenticator backend
  (CDP `WebAuthn.addVirtualAuthenticator` rejected with even minimal parameters;
  playwright 1.62.1 has no PRF option) — the automated suite therefore covers the real
  ceremony's *failure* handling, not the PRF happy path.
- **Operator manual evidence steps (≈2 minutes, any PRF-capable browser, e.g. Chrome with
  platform authenticator or a synced passkey):** `pnpm --filter @retropick/retro-ui dev`
  → `/earn#vault` → Create vault with a passkey → add an entry (second prompt) → Lock →
  Unlock → entry returns → export JSON, confirm no plaintext inside → (optional) second
  synced device: import + unlock. Capture screenshots/console.

## Judge demo

Same flow as the manual steps above (needs a PRF-capable browser on the judge side; the
page discloses this requirement inline).

## Remaining work

Operator manual happy-path evidence; judge demo recording at campaign close.

## Verdict

`CONDITIONAL` — implementation complete and failure-states E2E-verified; SPONSOR_QUALIFIED
awaits the manual PRF happy-path evidence on a real authenticator + judge-accessible
deployment (BLOCKER-001).
