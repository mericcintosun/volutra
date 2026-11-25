import { inflateRawSync } from "node:zlib";

// A minimal zip reader: finds the end of central directory, walks the central directory,
// and reads stored (method 0) and deflate (method 8) entries. An entry that is itself a
// .zip is read recursively. No zip64, no encryption. No dependency.

export interface ZipEntry {
  /** path inside the archive; entries of a nested zip are prefixed with that zip's path */
  name: string;
  data: Buffer;
}

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const MAX_DEPTH = 3;

function findEocd(buf: Buffer): number {
  const stop = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= stop; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i;
  }
  return -1;
}

export function readZip(buf: Buffer, prefix = "", depth = 0): ZipEntry[] {
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error("zip: end of central directory not found");
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: ZipEntry[] = [];

  for (let n = 0; n < total; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CENTRAL) throw new Error("zip: bad central directory entry");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/") || name.startsWith("__MACOSX/")) continue;
    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== SIG_LOCAL) throw new Error("zip: bad local header");
    const localName = buf.readUInt16LE(localOffset + 26);
    const localExtra = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localName + localExtra;
    const raw = buf.subarray(start, start + compSize);

    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw);
    else continue; // unsupported compression; the caller works with what it can read

    const fullName = prefix + name;
    if (fullName.toLowerCase().endsWith(".zip") && depth < MAX_DEPTH) {
      out.push(...readZip(data, `${fullName}/`, depth + 1));
    } else {
      out.push({ name: fullName, data });
    }
  }
  return out;
}
