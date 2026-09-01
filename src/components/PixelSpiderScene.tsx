import { memo, useMemo } from 'react';
import { hashSeed, mulberry32 } from '../data/seed';

/** ────────────────────────────────────────────────────────────────────────────
 *  Ambient background: a pixel-art cityscape with masked swingers crossing it.
 *
 *  Purely decorative. It renders behind everything, takes no pointer events and
 *  holds no application state — nothing here can affect or block the Financial
 *  Evidence Web above it.
 *
 *  Motion budget: every animation here is CSS on the compositor. No JavaScript
 *  runs per frame and nothing re-renders React — a background must not compete
 *  with the analysis for the main thread.
 *  ──────────────────────────────────────────────────────────────────────────── */

const VB_W = 1600;
const VB_H = 900;

/* ── Palette ──────────────────────────────────────────────────────────────── */
const SUIT_RED = '#e0453f';
const SUIT_BLUE = '#3d5fa8';
const LENS = '#c8e9ef';
const CITY_BACK = '#15151b';
const CITY_MID = '#1b1b23';
const CITY_FRONT = '#22222c';
const WINDOW_LIT = '#3ec8d8';

/* ── Pixel figure ─────────────────────────────────────────────────────────────
 *  13 × 18 cell bitmap of an original masked swinger, arms raised to the line.
 *    R = suit body   B = suit legs/trim   E = mask lens   . = empty            */
const FIGURE = [
  '.....RR......',
  '.....RR......',
  '....RRRR.....',
  '....R..R.....',
  '...RR..RR....',
  '...R.RR.R....',
  '...RREERR....',
  '....RRRR.....',
  '...RRRRRR....',
  '...RRBBRR....',
  '...RRRRRR....',
  '....BBBB.....',
  '....B..B.....',
  '...BB..BB....',
  '..BB....BB...',
  '..B......B...',
  '.BB......BB..',
  '.............',
];

const CELL_COLOR: Record<string, string> = {
  R: SUIT_RED,
  B: SUIT_BLUE,
  E: LENS,
};

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

/** Merge horizontally adjacent cells of one colour into a single rect. Keeps
 *  the figure at ~30 elements instead of ~120. */
function runsFor(rows: string[]): Run[] {
  const out: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w += 1;
      out.push({ x, y, w, fill: CELL_COLOR[ch] });
      x += w;
    }
  });
  return out;
}

const FIGURE_RUNS = runsFor(FIGURE);
const FIGURE_W = FIGURE[0].length;
const FIGURE_H = FIGURE.length;

function PixelFigure({ scale }: { scale: number }) {
  return (
    <g shapeRendering="crispEdges">
      {FIGURE_RUNS.map((r, i) => (
        <rect
          key={i}
          x={r.x * scale}
          y={r.y * scale}
          width={r.w * scale}
          height={scale}
          fill={r.fill}
        />
      ))}
    </g>
  );
}

/* ── Cityscape ────────────────────────────────────────────────────────────── */

interface Building {
  x: number;
  w: number;
  h: number;
  windows: { x: number; y: number }[];
}

/** One seamlessly tileable skyline tile, VB_W wide. Deterministic per seed so
 *  the silhouette never changes between renders or reloads. */
function skyline(seed: string, count: number, maxH: number, withWindows: boolean): Building[] {
  const rnd = mulberry32(hashSeed(seed));
  const out: Building[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const w = 70 + Math.floor(rnd() * 110);
    const h = 90 + Math.floor(rnd() * maxH);
    const windows: { x: number; y: number }[] = [];
    if (withWindows) {
      const cols = Math.floor((w - 18) / 22);
      const rows = Math.floor((h - 26) / 30);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rnd() > 0.86) windows.push({ x: 14 + c * 22, y: 18 + r * 30 });
        }
      }
    }
    out.push({ x, w, h, windows });
    x += w + 8 + Math.floor(rnd() * 26);
    if (x > VB_W) break;
  }
  return out;
}

function SkylineTile({ buildings, fill }: { buildings: Building[]; fill: string }) {
  return (
    <g>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={VB_H - b.h} width={b.w} height={b.h} fill={fill} />
          {/* Roof mast — reads as antennae on the skyline. */}
          {b.w > 120 && (
            <rect x={b.x + b.w / 2 - 2} y={VB_H - b.h - 26} width={4} height={26} fill={fill} />
          )}
          {b.windows.map((wnd, j) => (
            <rect
              key={j}
              x={b.x + wnd.x}
              y={VB_H - b.h + wnd.y}
              width={7}
              height={11}
              fill={WINDOW_LIT}
              opacity={0.5}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

/** A parallax layer: the tile is drawn twice, side by side, and translated by
 *  exactly one tile width — so the loop point is invisible. */
function ParallaxLayer({
  buildings,
  fill,
  duration,
  opacity,
  y,
}: {
  buildings: Building[];
  fill: string;
  duration: number;
  opacity: number;
  y: number;
}) {
  return (
    <g opacity={opacity} transform={`translate(0 ${y})`}>
      <g className="city-pan" style={{ animationDuration: `${duration}s` }}>
        <SkylineTile buildings={buildings} fill={fill} />
        <g transform={`translate(${VB_W} 0)`}>
          <SkylineTile buildings={buildings} fill={fill} />
        </g>
      </g>
    </g>
  );
}

/* ── Pendulum ─────────────────────────────────────────────────────────────────
 *  Small-angle solution of a pendulum:  θ(t) = A·cos(ωt + φ),  ω = 2π / T.
 *  Rotating the rig about its anchor places the figure at exactly
 *  (x, y) = (L·sin θ, L·cos θ) relative to that anchor — the same result as
 *  computing the coordinates directly, at a fraction of the cost.             */

const AMPLITUDE = Math.PI / 4; // ±45°

interface SwingerProps {
  /** Anchor x in viewBox units. */
  anchorX: number;
  anchorY: number;
  /** Web length. */
  length: number;
  /** Pendulum period, seconds. */
  period: number;
  /** Phase offset, radians. */
  phase: number;
  scale: number;
  opacity: number;
  /** Seconds for the anchor to drift one full screen width. */
  driftDuration: number;
  driftDelay: number;
}

function Swinger({
  anchorX,
  anchorY,
  length,
  period,
  phase,
  scale,
  opacity,
  driftDuration,
  driftDelay,
}: SwingerProps) {
  const figureW = FIGURE_W * scale;
  const figureH = FIGURE_H * scale;

  // A phase offset is a shift along the cycle, i.e. a negative animation-delay.
  const phaseDelay = -(phase / (2 * Math.PI)) * period;

  return (
    <g
      className="swing-drift"
      style={{ animationDuration: `${driftDuration}s`, animationDelay: `${driftDelay}s` }}
      opacity={opacity}
    >
      <g
        className="pendulum"
        style={{
          transformOrigin: `${anchorX}px ${anchorY}px`,
          animationDuration: `${period / 2}s`,
          animationDelay: `${phaseDelay}s`,
          // Amplitude A = pi/4, expressed for the CSS keyframes.
          ['--amp' as string]: `${(AMPLITUDE * 180) / Math.PI}deg`,
        }}
      >
        {/* Silk line: anchor -> hands. */}
        <line
          className="web-line"
          x1={anchorX}
          y1={anchorY}
          x2={anchorX}
          y2={anchorY + length}
          stroke={LENS}
          strokeOpacity={0.32}
          strokeLinecap="round"
          style={{
            animationDuration: `${period / 4}s`,
            animationDelay: `${phaseDelay}s`,
          }}
        />
        {/* Anchor point where the web bites. */}
        <circle cx={anchorX} cy={anchorY} r={2.5} fill={LENS} opacity={0.35} />
        <g transform={`translate(${anchorX - figureW / 2} ${anchorY + length - scale})`}>
          <PixelFigure scale={scale} />
        </g>
        {/* Faint motion trail behind the figure. */}
        <rect
          x={anchorX - figureW / 2}
          y={anchorY + length + figureH * 0.2}
          width={figureW}
          height={2}
          fill={SUIT_RED}
          opacity={0.18}
        />
      </g>
    </g>
  );
}

/* ── Scene ────────────────────────────────────────────────────────────────── */

export const PixelSpiderScene = memo(function PixelSpiderScene() {
  const back = useMemo(() => skyline('webquant-back', 11, 190, false), []);
  const mid = useMemo(() => skyline('webquant-mid', 10, 250, false), []);
  const front = useMemo(() => skyline('webquant-front', 9, 300, true), []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        focusable="false"
      >
        {/* Cityscape occupies the bottom third, muted so data always wins. */}
        <ParallaxLayer buildings={back} fill={CITY_BACK} duration={260} opacity={0.5} y={40} />
        <ParallaxLayer buildings={mid} fill={CITY_MID} duration={185} opacity={0.42} y={18} />
        <ParallaxLayer buildings={front} fill={CITY_FRONT} duration={120} opacity={0.34} y={0} />

        {/* Swingers cross the upper and middle bands. */}
        <Swinger
          anchorX={-120}
          anchorY={-40}
          length={430}
          period={5.2}
          phase={0}
          scale={5}
          opacity={0.3}
          driftDuration={46}
          driftDelay={0}
        />
        <Swinger
          anchorX={-120}
          anchorY={-70}
          length={300}
          period={3.8}
          phase={Math.PI / 2}
          scale={3}
          opacity={0.18}
          driftDuration={72}
          driftDelay={-30}
        />
      </svg>
    </div>
  );
});
