/**
 * Accountie mark ("Şerit"): a thermal receipt with a torn bottom edge and grey printed lines. The amber row leaves
 * through a cut in its right edge with a V-notched end: the line torn off the receipt that goes to Luca.
 * Colours come from tokens, so it follows the theme. public/icon.svg is the fixed-colour app icon of the same drawing.
 */
export function BrandMark({ className = "mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path className="mark-strip" d="M21 14V5H5V27l4-4 4 4 4-4 4 4V22" />
      <path className="mark-thermal" d="M8 9h10M8 13h4" />
      <path className="mark-luca" d="M8 16H28l-2 2 2 2H8z" />
    </svg>
  );
}
