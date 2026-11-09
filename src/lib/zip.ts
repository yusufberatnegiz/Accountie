import { inflateRawSync } from "node:zlib";

/**
 * The bytes a zip (an .xlsx, a GİB download) would unpack to, from its central directory, or Infinity when the directory is missing, damaged or
 * ZIP64. Checked before the parser inflates anything, so a small file cannot expand into gigabytes in memory.
 */
export function unzippedSize(file: Buffer): number {
  const end = file.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > file.length) return Infinity;
  const count = file.readUInt16LE(end + 10);
  let at = file.readUInt32LE(end + 16);
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > file.length || file.readUInt32LE(at) !== 0x02014b50) return Infinity;
    const size = file.readUInt32LE(at + 24);
    if (size === 0xffffffff) return Infinity;
    total += size;
    at += 46 + file.readUInt16LE(at + 28) + file.readUInt16LE(at + 30) + file.readUInt16LE(at + 32);
  }
  return total;
}

export class ZipError extends Error {}

/**
 * The files of a zip, each inflated with a hard cap on its output (zlib maxOutputLength), so a header that lies about sizes
 * still cannot blow up memory. Only stored and deflated entries; folders are skipped. Throws ZipError on anything else.
 */
export function unzip(file: Buffer, { maxFiles, maxFileBytes, maxTotalBytes }: { maxFiles: number; maxFileBytes: number; maxTotalBytes: number }): { name: string; data: Buffer }[] {
  const end = file.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > file.length) throw new ZipError("zip");
  const count = file.readUInt16LE(end + 10);
  if (count > maxFiles) throw new ZipError("files");
  let at = file.readUInt32LE(end + 16);
  let total = 0;
  const out: { name: string; data: Buffer }[] = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > file.length || file.readUInt32LE(at) !== 0x02014b50) throw new ZipError("zip");
    const method = file.readUInt16LE(at + 10);
    const compressed = file.readUInt32LE(at + 20);
    const nameLength = file.readUInt16LE(at + 28);
    const local = file.readUInt32LE(at + 42);
    const name = file.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    at += 46 + nameLength + file.readUInt16LE(at + 30) + file.readUInt16LE(at + 32);
    if (name.endsWith("/")) continue;
    if (local + 30 > file.length || file.readUInt32LE(local) !== 0x04034b50) throw new ZipError("zip");
    const start = local + 30 + file.readUInt16LE(local + 26) + file.readUInt16LE(local + 28);
    if (start + compressed > file.length) throw new ZipError("zip");
    const raw = file.subarray(start, start + compressed);
    let data: Buffer;
    try {
      if (method === 0) data = Buffer.from(raw);
      else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: maxFileBytes });
      else throw new ZipError("method");
    } catch (e) {
      throw e instanceof ZipError ? e : new ZipError("size");
    }
    if (data.length > maxFileBytes || (total += data.length) > maxTotalBytes) throw new ZipError("size");
    out.push({ name, data });
  }
  return out;
}
