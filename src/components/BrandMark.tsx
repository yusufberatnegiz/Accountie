/**
 * Accountie mark: a thermal receipt strip with a torn edge. Two grey printed lines stay on the paper;
 * the third, in ledger blue, runs off the strip: the figure that goes to Luca.
 * Colours come from tokens, so it follows the theme. public/icon.svg is the fixed-colour app icon of the same drawing.
 */
export function BrandMark({ className = "mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path className="mark-strip" d="M6 3h15v24l-2.5-2-2.5 2-2.5-2-2.5 2-2.5-2L6 27z" />
      <path className="mark-thermal" d="M10 9h7M10 14h5" />
      <path className="mark-luca" d="M10 19.5h18" />
    </svg>
  );
}

