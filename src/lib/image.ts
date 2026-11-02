import sharp from "sharp";

// Under Vercel's ~4.5 MB request body cap, so oversize uploads get our Turkish 413 instead of the platform's.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Decodes (which verifies the content), applies EXIF rotation, shrinks, re-encodes as JPEG without metadata. */
export async function normalizeImage(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

// Magic-byte check before the decoder sees the file: sharp also opens SVG, GIF, TIFF, PDF..., which we never want.
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

export function sniffImageType(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/heic" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 8) === "PNG\r\n\x1a\n") return "image/png";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(8, 12))) return "image/heic";
  return null;
}
