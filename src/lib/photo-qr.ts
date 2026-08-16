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
  /** Diameter of each data-module dot, as a fraction of the cell. */
  dotScale?: number;
  /** Opacity of the semi-transparent wash drawn over the photo before the dots. */
  washOpacity?: number;
};

const DEFAULTS: Required<PhotoQrOptions> = {
  cellPx: 22,
  // The spec-recommended quiet zone is 4 modules, but most real-world
  // scanners (including phone cameras) tolerate less — 2 keeps the plain
  // border thin so the photo fills nearly the whole image instead of
  // leaving a large empty frame around it.
  quietZoneModules: 2,
  darkColor: "#241a10",
  lightColor: "#fdf8ee",
  dotScale: 0.72,
  washOpacity: 0.4,
};

/**
 * Renders `data` as a QR code whose data-carrying modules are built from the
 * given photo itself, not a small logo dropped on top. The photo fills the
 * whole grid with a soft translucent wash over it, and every data module
 * gets a plain, consistently-sized dot (black for dark modules, near-white
 * for light ones) — a decoder only needs the *center* of a module to read
 * correctly, so a dot well short of the full cell still decodes reliably
 * while leaving a visible ring of the washed photo around it, which is what
 * actually reads as "the photo" at a glance. Finder patterns, the timing
 * pattern, and alignment patterns are the exception: kept crisp and
 * untouched, since a scanner needs those intact to lock onto the grid
 * before it can read anything else. High error correction (H, 30%) gives
 * the decoder margin for everything else.
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
  const ctx = canvas.getContext("2d")!;
  const alignCenters = alignmentCenters(n);

  ctx.fillStyle = opts.lightColor;
  ctx.fillRect(0, 0, size, size);
  drawImageCover(ctx, image, imageWidth, imageHeight, quiet, quiet, inner);

  // Soft wash over the photo so it reads as one cohesive backdrop rather
  // than fighting the dots for attention — also a plain fixed color, so it
  // never itself risks looking like a stray dark/light module.
  ctx.fillStyle = opts.lightColor;
  ctx.globalAlpha = opts.washOpacity;
  ctx.fillRect(quiet, quiet, inner, inner);
  ctx.globalAlpha = 1;

  const dotRadius = (opts.cellPx * opts.dotScale) / 2;

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

      ctx.fillStyle = dark ? opts.darkColor : opts.lightColor;
      fillCircle(ctx, x + opts.cellPx / 2, y + opts.cellPx / 2, dotRadius);
    }
  }

  return size;
}
