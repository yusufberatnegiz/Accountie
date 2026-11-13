/**
 * iyzico's own footer band (iyzico ile Öde, Mastercard, Visa, American Express, Troy), from iyzico's logo pack: required on the
 * site by iyzico's merchant terms. The coloured band on light pages, the white one when the look is dark (site.css).
 */
export function PayLogos({ className = "" }: { className?: string }) {
  return (
    <p className={`pay-logos ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 2x bitmap from iyzico's pack, nothing for next/image to do */}
      <img className="on-light" src="/odeme/iyzico-band-renkli.png" width={429} height={32} alt="iyzico ile Öde, Mastercard, Visa, American Express, Troy" />
      {/* eslint-disable-next-line @next/next/no-img-element -- same band, white for the dark look */}
      <img className="on-dark" src="/odeme/iyzico-band-beyaz.png" width={456} height={32} alt="iyzico ile Öde, Mastercard, Visa, American Express, Troy" />
    </p>
  );
}
