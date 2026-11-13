/**
 * iyzico's own footer band (iyzico ile Öde, Mastercard, Visa, American Express, Troy), from iyzico's logo pack: required on the
 * site by iyzico's merchant terms. Always the coloured band; on the dark look it sits on a light plate so the dark marks
 * (VISA, troy) stay readable (globals.css).
 */
export function PayLogos({ className = "" }: { className?: string }) {
  return (
    <p className={`pay-logos ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 2x bitmap from iyzico's pack, nothing for next/image to do */}
      <img src="/odeme/iyzico-band-renkli.png" width={429} height={32} loading="lazy" decoding="async" alt="iyzico ile Öde, Mastercard, Visa, American Express, Troy" />
    </p>
  );
}
