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

/** A cut-out's long edge: the models read up to 2576 px, and a narrow receipt from a crowded photo needs every pixel of its width. */
const CROP_MAX_EDGE = 2576;

/** One receipt cut from the full-size upload (EXIF-rotated, as the model saw it), with a margin, in one pass and one JPEG encoding. */
export async function cropReceipt(input: Buffer, box: { left: number; top: number; right: number; bottom: number }): Promise<Buffer> {
  const meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  // Orientations 5-8 turn the photo a quarter: width and height swap once rotated.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = (turned ? meta.height : meta.width) ?? 0;
  const height = (turned ? meta.width : meta.height) ?? 0;
  const pad = 15; // thousandths: the model's edges are approximate
  const x0 = Math.floor((Math.max(0, box.left - pad) / 1000) * width);
  const y0 = Math.floor((Math.max(0, box.top - pad) / 1000) * height);
  const x1 = Math.ceil((Math.min(1000, box.right + pad) / 1000) * width);
  const y1 = Math.ceil((Math.min(1000, box.bottom + pad) / 1000) * height);
  return sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .extract({ left: x0, top: y0, width: Math.max(1, Math.min(width, x1) - x0), height: Math.max(1, Math.min(height, y1) - y0) })
    .resize({ width: CROP_MAX_EDGE, height: CROP_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** A PDF by its magic bytes ("%PDF-"); it is never decoded here, only passed to the reader. */
export const isPdf = (b: Uint8Array) => b.length >= 5 && String.fromCharCode(...b.subarray(0, 5)) === "%PDF-";

export const MAX_PDF_PAGES = 5;
/**
 * Pages counted from the "/Type /Page" objects in the raw file.
 * shortcut: pages kept inside compressed object streams are not seen (counted 0, let through); parse the PDF if that matters.
 */
export const pdfPageCount = (b: Uint8Array) => (Buffer.from(b).toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;

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
