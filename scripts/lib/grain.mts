import { deflateSync } from "node:zlib";

/**
 * Bakes the film grain the web gets from an `feTurbulence` data URI into a
 * tileable PNG, because `react-native-svg` implements no filters at all and a
 * live version of the CSS overlay is not reachable from a phone.
 *
 * This is a faithful reimplementation of what the browser's filter does, not an
 * approximation of the look: fractal (value) noise, summed over the same three
 * octaves at the same 0.9 base frequency, greyscale, alpha-modulated so the
 * grain darkens and lightens instead of only lightening. Tiling is enforced by
 * sampling the noise on a torus, so the 120x120 tile repeats without a visible
 * seam — the same 120x120 the CSS data URI uses.
 *
 * The PNG is written with `zlib` and four chunks. No image library: the output
 * is 8-bit greyscale-plus-alpha, which is a filter byte, a deflate stream and a
 * CRC table, and a dependency would be more surface than that.
 */

export const GRAIN_SIZE = 120;
const OCTAVES = 3;
const BASE_FREQUENCY = 0.9;
const SEED = 0x5eed_1234;

/** One octave of value noise on a wrapping lattice. */
function octave(period: number, seed: number): Float64Array {
  const lattice = new Float64Array(period * period);
  // xorshift32: deterministic across machines, which matters because a
  // regenerated grain that looks different would churn a committed asset.
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
  for (let i = 0; i < lattice.length; i += 1) lattice[i] = next();
  return lattice;
}

function smooth(t: number): number {
  // Quintic, which is what feTurbulence's turbulence base uses.
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Value noise sampled on a torus, so the tile edges meet exactly. */
function noiseAt(
  lattice: Float64Array,
  period: number,
  x: number,
  y: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const at = (ix: number, iy: number) =>
    lattice[(((iy % period) + period) % period) * period + (((ix % period) + period) % period)]!;
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/** RGBA bytes for the grain tile, greyscale noise modulated into alpha. */
export function grainPixels(size = GRAIN_SIZE): Buffer {
  // `feTurbulence baseFrequency="0.9"` is 0.9 cycles per *user unit*, and the CSS
  // tile is 120 user units square — so roughly 108 lattice cells across it, i.e.
  // close to one cell per pixel. Each further octave doubles the cell count,
  // which is the same relationship `numOctaves` encodes.
  const octaves = Array.from({ length: OCTAVES }, (_, i) => {
    const cells = Math.max(2, Math.round(size * BASE_FREQUENCY * 2 ** i));
    return { lattice: octave(cells, SEED + i * 0x9e37_79b9), cells };
  });

  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      let amplitude = 1;
      let total = 0;
      for (const { lattice, cells } of octaves) {
        value +=
          amplitude *
          noiseAt(lattice, cells, (x / size) * cells, (y / size) * cells);
        total += amplitude;
        amplitude /= 2;
      }
      // Centre on mid-grey: half the samples darken, half lighten, which is what
      // a grain overlay wants. The CSS version is luminance noise over ink.
      const centred = value / total - 0.5;
      const shade = Math.round(255 * (0.5 + centred));

      const i = (y * size + x) * 4;
      out[i] = shade;
      out[i + 1] = shade;
      out[i + 2] = shade;
      out[i + 3] = 255;
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xff_ff_ff_ff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xff_ff_ff_ff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** 8-bit RGBA PNG. Greyscale colour type 6 keeps the alpha channel. */
export function encodePng(pixels: Buffer, width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One filter byte per scanline. Filter 1 (Sub) barely helps noise, so the
  // honest choice is 0 (None) and letting deflate do the work.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const at = y * (width * 4 + 1);
    raw[at] = 0;
    pixels.copy(raw, at + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
