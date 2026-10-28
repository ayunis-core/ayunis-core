import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * An RGB gradient PNG padded with an incompressible text chunk, so the file is
 * as large as a phone photo while its pixels still compress like one.
 */
export function createLargePng(
  width: number,
  height: number,
  paddingBytes: number,
): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rowLength = 1 + width * 3;
  const pixels = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = y * rowLength + 1 + x * 3;
      pixels[offset] = Math.floor((x / width) * 255);
      pixels[offset + 1] = Math.floor((y / height) * 255);
      pixels[offset + 2] = 128;
    }
  }
  const padding = Buffer.concat([
    Buffer.from("Comment\0", "latin1"),
    Buffer.from(randomBytes(paddingBytes / 2).toString("hex"), "latin1"),
  ]);
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("tEXt", padding),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
