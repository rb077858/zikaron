import qrcode from "qrcode-generator";

// The 7x7 finder pattern plus its 1-module separator, at each of the 3
// corners a QR code always has one. These are the very first thing a
// scanner looks for, so they're rendered crisp and solid — no photo
// blending — regardless of how aggressively the rest of the code is
// stylized. This is standard practice for every "artistic QR" technique;
// distorting the finder patterns is the single most common way to make one
// unreadable.
const FINDER_ZONE = 8;

function isFinderZone(row: number, col: number, n: number): boolean {
  const inTopLeft = row < FINDER_ZONE && col < FINDER_ZONE;
  const inTopRight = row < FINDER_ZONE && col >= n - FINDER_ZONE;
  const inBottomLeft = row >= n - FINDER_ZONE && col < FINDER_ZONE;
  return inTopLeft || inTopRight || inBottomLeft;
}

// Timing pattern: the alternating dark/light strip at row 6 and column 6
// that a scanner uses to lock onto the module grid. Distorting it is nearly
// as fatal to decoding as distorting a finder pattern, so it's protected
// the same way.
const TIMING_INDEX = 6;

function isTimingPattern(row: number, col: number): boolean {
  return row === TIMING_INDEX || col === TIMING_INDEX;
}

// Alignment pattern center positions per module axis, by QR version — the
// standard table from ISO/IEC 18004 Annex E. Needed for larger codes (longer
// URLs) so the code stays reliable when scanned at an angle, e.g. a phone
// camera reading it off an engraved, non-flat gravestone surface.
const ALIGNMENT_POSITIONS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

function alignmentCenters(n: number): Array<[number, number]> {
  const version = (n - 17) / 4;
  const positions = ALIGNMENT_POSITIONS[version - 1];
  if (!positions || positions.length === 0) return [];
  const first = positions[0];
  const last = positions[positions.length - 1];
  const centers: Array<[number, number]> = [];
  for (const r of positions) {
    for (const c of positions) {
      // Skip the three combinations that would overlap a finder pattern —
      // the standard simply omits an alignment pattern there.
      const overlapsFinder =
        (r === first && c === first) ||
        (r === first && c === last) ||
        (r === last && c === first);
      if (!overlapsFinder) centers.push([r, c]);
    }
  }
  return centers;
}

function isAlignmentPattern(row: number, col: number, centers: Array<[number, number]>): boolean {
  for (const [cr, cc] of centers) {
    if (Math.abs(row - cr) <= 2 && Math.abs(col - cc) <= 2) return true;
  }
  return false;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  size: number
): void {
  const scale = Math.max(size / imgW, size / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  ctx.drawImage(img, x + (size - drawW) / 2, y + (size - drawH) / 2, drawW, drawH);
}

function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  if (radius <= 0) return;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

export type PhotoQrOptions = {
  /** Pixels per QR module in the rendered bitmap. Higher = sharper print. */
  cellPx?: number;
  /** Blank border around the code, in modules — required for reliable scanning. */
  quietZoneModules?: number;
  darkColor?: string;
  lightColor?: string;
};

const DEFAULTS: Required<PhotoQrOptions> = {
  cellPx: 22,
  quietZoneModules: 4,
  darkColor: "#241a10",
  lightColor: "#fdf8ee",
};

/**
 * Renders `data` as a QR code whose data-carrying modules are built from the
 * given photo itself, not a small logo dropped on top: dark modules become
 * large circles tinted with that cell's own sampled photo color (biased
 * heavily toward black so luminance stays low enough to always read as
 * "dark" no matter how bright the underlying photo is there); light modules
 * mostly let the raw photo show through untouched, only gaining a small
 * corrective light-tinted dot where the photo itself is too dark to read as
 * "light". High error correction (H, 30%) gives the decoder enough
 * redundancy to tolerate this everywhere outside the finder patterns,
 * timing pattern, and alignment patterns — the structural modules a
 * scanner needs untouched to lock onto the grid in the first place.
 */
export function renderPhotoQr(
  canvas: HTMLCanvasElement,
  data: string,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  options?: PhotoQrOptions
): number {
  const opts = { ...DEFAULTS, ...options };
  const qr = qrcode(0, "H");
  qr.addData(data);
  qr.make();
  const n = qr.getModuleCount();

  const quiet = opts.quietZoneModules * opts.cellPx;
  const inner = n * opts.cellPx;
  const size = inner + quiet * 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const darkRgb = hexToRgb(opts.darkColor);
  const lightRgb = hexToRgb(opts.lightColor);
  const alignCenters = alignmentCenters(n);

  ctx.fillStyle = opts.lightColor;
  ctx.fillRect(0, 0, size, size);
  drawImageCover(ctx, image, imageWidth, imageHeight, quiet, quiet, inner);

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = quiet + col * opts.cellPx;
      const y = quiet + row * opts.cellPx;
      const dark = qr.isDark(row, col);

      if (
        isFinderZone(row, col, n) ||
        isTimingPattern(row, col) ||
        isAlignmentPattern(row, col, alignCenters)
      ) {
        ctx.fillStyle = dark ? opts.darkColor : opts.lightColor;
        ctx.fillRect(x, y, opts.cellPx, opts.cellPx);
        continue;
      }

      const { data: px } = ctx.getImageData(x, y, opts.cellPx, opts.cellPx);
      let r = 0;
      let g = 0;
      let b = 0;
      const count = px.length / 4;
      for (let i = 0; i < px.length; i += 4) {
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
      }
      r /= count;
      g /= count;
      b /= count;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (dark) {
        // Nearly fills the cell regardless of the photo, so it always reads
        // as dark; only the last ~15% of size responds to local brightness.
        const frac = clamp(0.82 + Math.max(0, 170 - lum) / 170 * 0.16, 0.82, 0.98);
        ctx.fillStyle = mix([r, g, b], darkRgb, 0.8);
        fillCircle(ctx, x + opts.cellPx / 2, y + opts.cellPx / 2, (opts.cellPx * frac) / 2);
      } else if (lum < 150) {
        // The photo is too dark here to safely read as a light module —
        // brighten just this cell, tinted, rather than leaving it raw.
        const frac = clamp(((150 - lum) / 150) * 0.85, 0, 0.85);
        ctx.fillStyle = mix([r, g, b], lightRgb, 0.8);
        fillCircle(ctx, x + opts.cellPx / 2, y + opts.cellPx / 2, (opts.cellPx * frac) / 2);
      }
      // else: light module over an already-light photo area — leave the
      // raw photo showing through untouched.
    }
  }

  return size;
}
