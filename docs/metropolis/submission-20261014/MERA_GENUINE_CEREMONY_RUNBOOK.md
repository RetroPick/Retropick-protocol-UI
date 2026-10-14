# Genuine Mera ceremony — actual apex product

Read-only browser inspection at 2026-10-13T21:10:41Z verified **https://retropick.xyz/earn#vault**, the Vault tab, Private Strategy Vault, its passkey PRF disclosure and the “Create vault with a passkey” action. Browser secure context and credential APIs were available. **No credential ceremony, enrollment, PRF success or cross-device reconstruction was performed.** These remain unverified.

Evidence: `/home/ubuntu/retropick-media/metropolis-20261014/editor-kit/mera-apex-vault-readonly.json` and `mera-apex-vault-readonly.png`.

The actual UI actions needed for a qualifying non-account demonstration are:

1. On a genuine PRF-capable browser/authenticator, open https://retropick.xyz/earn#vault, select **Vault**, then **Create vault with a passkey**. Complete the browser's real device/biometric/authenticator prompt. Keep credential secrets and personal device account identities out of recorded frames.
2. Select **Add private entry**. Enter a clearly marked demonstration note, for example title “Testnet liquidity review” and content “Check live Kuru depth before placing a limit order. Demonstration note.” Select a real available kind such as **Trading thesis**.
3. Select **Save (re-encrypts with passkey)** and complete the real assertion prompt. Wait for the entry to appear. A failed or PRF-unavailable prompt is not a successful encryption demonstration.
4. Select **Export**, preserving the actual encrypted JSON privately. Record a ciphertext preview or its file digest without exposing authenticator material. Never substitute a fabricated vault.
5. Select **Lock now**. Confirm plaintext entries disappear and **Unlock with passkey** appears. Complete the assertion and confirm the same note returns.
6. Open **the same https://retropick.xyz/earn#vault relying-party domain** in a genuinely fresh browser profile or second device with the same synced passkey. A same-profile reload does not prove reconstruction. Select **Import an exported vault**, paste the actual exported encrypted JSON, then **Import vault**.
7. Select **Unlock with passkey**. Use the same genuine passkey via the platform-supported credential mechanism. Verify the same plaintext note. Record the successful result and matching exported ciphertext digest; do not silently create a new credential or different vault.

An authenticator that lacks PRF, a cancelled assertion, missing synced credential, or a different relying-party host may prevent the ceremony. Record the actual error and keep qualification conditional; do not inject a Playwright virtual authenticator, mocked credential, PRF output or successful UI state as bounty proof.

This non-account vault protects private data at rest. Unlocking it **does not grant trading or fee-claim spending authority**. The separate Protected Earn feature requires its own wallet/contract proof and authorization before economic actions; do not reuse non-account vault proof to claim financial signing succeeded.

Pinned installed Mera SDK **0.2.0** source establishes a concrete non-account derivation namespace: `dist/secret.js` derives a non-extractable AES-256-GCM key using HKDF-SHA-256 and info **`mera.v1.encrypt.secret`**. Creation and subsequent re-encryption use fresh random 32-byte PRF salts, persisted with each vault. This is SDK-level domain separation from other derived keys, not a custom RetroPick namespace claim. `retropick.strategy-vault.v1` is only the browser storage key, and `retropick.xyz` is the relying-party domain. Code inspection does not establish a successful genuine ceremony or cross-device reconstruction.
