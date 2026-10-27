'use client';

import React, { useState } from 'react';
import { FiKey, FiLock, FiCheckCircle } from 'react-icons/fi';
import { RiShieldCheckLine, RiFingerprintLine } from 'react-icons/ri';
import { toast } from 'sonner';

export function EarnProtectionView() {
  const [isPasskeyActive, setIsPasskeyActive] = useState(true);
  const [isHandoffConfigured, setIsHandoffConfigured] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('0x84f2...7d8e');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-[#836ef9]/10 border-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#836ef9]/20 border-none flex items-center justify-center text-[#836ef9] shrink-0">
            <RiShieldCheckLine className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              Protected Earn Protocol Guard
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#5feddf]/15 text-[#5feddf] border-none font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#a6a0b7] mt-0.5">
              Smart contract vaults isolating creator fees from hot wallets.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsPasskeyActive(v => !v);
            toast.success(isPasskeyActive ? 'Passkey derived session paused' : 'Passkey derived session re-authorized');
          }}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#836ef9] hover:bg-[#9583fc] text-white shadow-[0_0_15px_rgba(131,110,249,0.35)] transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto border-none"
        >
          {isPasskeyActive ? 'Re-derive Passkey' : 'Activate Passkey'}
        </button>
      </div>

      {/* Grid of Security Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: Passkey Signer */}
        <div className="bg-[#12141c] border-none rounded-xl p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#a6a0b7] flex items-center gap-1.5">
                <RiFingerprintLine className="w-4 h-4 text-[#836ef9]" /> WebAuthn Signer
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#181a24] text-[#5feddf] border-none">
                P-256 Curve
              </span>
            </div>

            <div className="mt-4">
              <div className="text-base font-bold text-white">Biometric Passkey</div>
              <p className="text-xs text-[#615a78] mt-1">
                Hardware enclave protection for fee escrow withdrawal rights.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#1e2230] flex items-center justify-between">
            <span className="text-xs font-mono text-[#a6a0b7]">Enclave Status</span>
            <span className="text-xs font-semibold text-[#5feddf] flex items-center gap-1">
              <FiCheckCircle className="w-3.5 h-3.5" /> Hardware Bound
            </span>
          </div>
        </div>

        {/* Module 2: Fee Recipient Handoff */}
        <div className="bg-[#12141c] border-none rounded-xl p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#a6a0b7] flex items-center gap-1.5">
                <FiKey className="w-4 h-4 text-[#5feddf]" /> Fee Recipient Handoff
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#181a24] text-[#a6a0b7] border-none">
                Onchain Registry
              </span>
            </div>

            <div className="mt-4">
              <div className="text-base font-bold text-white">Safe Fee Delegation</div>
              <p className="text-xs text-[#615a78] mt-1">
                Designate a cold multisig or treasury to claim launch fees.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#1e2230] flex items-center justify-between">
            <span className="text-xs font-mono text-[#a6a0b7]">Delegated Vault</span>
            <span className="text-xs font-mono text-white font-bold">{recipientAddress}</span>
          </div>
        </div>

        {/* Module 3: Time-Lock Delay */}
        <div className="bg-[#12141c] border-none rounded-xl p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#a6a0b7] flex items-center gap-1.5">
                <FiLock className="w-4 h-4 text-[#c084fc]" /> Timelock Escrow
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#181a24] text-[#c084fc] border-none">
                48h Cooldown
              </span>
            </div>

            <div className="mt-4">
              <div className="text-base font-bold text-white">Emergency Withdrawal Delay</div>
              <p className="text-xs text-[#615a78] mt-1">
                Automatic 48-hour freeze on unauthorized transfers.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#1e2230] flex items-center justify-between">
            <span className="text-xs font-mono text-[#a6a0b7]">Delay Setting</span>
            <span className="text-xs font-mono text-[#c084fc] font-bold">172,800 Blocks</span>
          </div>
        </div>
      </div>

      {/* Simulator Card */}
      <div className="bg-[#12141c] border-none rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white m-0">Protected Fee Handoff Simulator</h3>
          <button
            onClick={() => {
              setIsHandoffConfigured(true);
              toast.success('Handoff verified on Monad Testnet');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#836ef9]/15 hover:bg-[#836ef9]/25 text-[#836ef9] border-none text-xs font-semibold transition-all cursor-pointer"
          >
            Run Security Audit
          </button>
        </div>

        <div className="p-4 rounded-lg bg-[#0e1017] border-none flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[#a6a0b7]">
            <span>Signer Algorithm:</span>
            <span className="text-white">WebAuthn / ECDSA P-256 (FIPS 186-4)</span>
          </div>
          <div className="flex items-center justify-between text-[#a6a0b7]">
            <span>Creator Smart Account:</span>
            <span className="text-[#5feddf]">0x71C...498B (ERC-4337 Compatible)</span>
          </div>
          <div className="flex items-center justify-between text-[#a6a0b7]">
            <span>Current Protection Mode:</span>
            <span className="text-[#836ef9] font-bold">HARDWARE ENCLAVE ISOLATED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
