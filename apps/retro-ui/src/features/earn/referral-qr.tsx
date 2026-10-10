'use client';
// Referral QR tile — renders the referral link as a scannable code (offline, no network).
import { QRCodeSVG } from 'qrcode.react';

export function ReferralQr({ value, label }: { value: string; label: string }) {
  return <figure className="rp-qr">
    <QRCodeSVG value={value} size={104} bgColor="#ffffff" fgColor="#1d1440" aria-hidden />
    <figcaption>{label}</figcaption>
  </figure>;
}
