// Minimal ZIP reading and writing for DOCX files, built on the platform's
// DecompressionStream and CompressionStream. No ZIP64, encryption or spanning.

// A DOCX part this large is not text; refusing it keeps a hostile file from
// filling the tab's memory.
const MAX_ENTRY = 64 * 1024 * 1024;
const ZIP64 = 0xffffffff;

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
// 1 January 1980, the earliest DOS date; some readers reject a zero date.
const DOS_DATE = 0x21;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Reads the entries of a ZIP archive: all of them, or only the names in `wanted`. */
export async function readZip(bytes: Uint8Array, wanted?: Iterable<string>): Promise<Map<string, Uint8Array>> {
  const only = wanted ? new Set(wanted) : null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === END) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a ZIP file");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  if (count === 0xffff || at === ZIP64) throw new Error("This file uses ZIP64, which is not supported.");
  const names = new TextDecoder();
  const entries = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== CENTRAL) throw new Error("damaged ZIP directory");
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const unpacked = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = names.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (only && !only.has(name)) continue;
    if (size === ZIP64 || unpacked === ZIP64 || local === ZIP64) throw new Error("This file uses ZIP64, which is not supported.");
    if (unpacked > MAX_ENTRY) throw new Error(`${name} is too large to read.`);

    if (view.getUint32(local, true) !== LOCAL) throw new Error("damaged ZIP entry");
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) entries.set(name, data);
    else if (method === 8) entries.set(name, await pipe(data, new DecompressionStream("deflate-raw")));
    else throw new Error(`unsupported ZIP compression ${method}`);
  }
  return entries;
}

let crcTable: Uint32Array | undefined;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  const table = crcTable;
  for (const b of bytes) crc = table[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Writes a ZIP archive with deflated entries, in the given order. */
export async function writeZip(files: [string, Uint8Array | string][]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const packed = await pipe(data, new CompressionStream("deflate-raw"));
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, LOCAL, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 8, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, packed.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, packed);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, CENTRAL, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 8, true);
    central.setUint16(14, DOS_DATE, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, packed.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    directory.push(new Uint8Array(central.buffer), nameBytes);
    offset += 30 + nameBytes.length + packed.length;
  }
  const directorySize = directory.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, END, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...directory, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
