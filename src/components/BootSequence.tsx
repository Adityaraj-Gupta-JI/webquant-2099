import { useEffect, useState } from 'react';

/** Original animated intro, used whenever no video asset is present.
 *  A 2099 boot sequence rather than a broken <video> element — the demo must
 *  never show a dead frame. Built by Chetan Kumar (24BLC1059). */

const LINES = [
  'WEBQUANT 2099 // cold boot',
  'mounting deterministic quant core ........ OK',
  'spawning agent swarm [6] ................. OK',
  '  market · fundamental · news',
  '  risk · investor · synthesis',
  'calibrating spider-sense ................. OK',
  'evidence web :: 24 nodes / 27 edges ...... READY',
];

const RINGS = [26, 48, 70, 92];
const SPOKES = 10;

const pt = (i: number, r: number) => {
  const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2;
  return [120 + Math.cos(a) * r, 120 + Math.sin(a) * r] as const;
};

const ringPath = (r: number) => {
  const pts = Array.from({ length: SPOKES }, (_, i) => pt(i, r));
  return `M ${pts[0][0]} ${pts[0][1]} ${pts.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
};

export function BootSequence() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= LINES.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 220 : 300);
    return () => clearTimeout(id);
  }, [shown]);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8 px-6 sm:flex-row sm:gap-12">
      <svg viewBox="0 0 240 240" className="h-44 w-44 shrink-0 sm:h-56 sm:w-56" aria-hidden>
        {Array.from({ length: SPOKES }, (_, i) => {
          const [x, y] = pt(i, 100);
          return (
            <line key={i} x1={120} y1={120} x2={x} y2={y} stroke="#33333d" strokeWidth={0.7} />
          );
        })}
        {RINGS.map((r, i) => (
          <path
            key={r}
            className="boot-ring"
            d={ringPath(r)}
            fill="none"
            stroke={i === 2 ? '#3ec8d8' : '#2b2b34'}
            strokeWidth={0.9}
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
        <circle cx={120} cy={120} r={14} fill="#0b0b0e" stroke="#e0453f" strokeWidth={1} />
        <circle cx={120} cy={120} r={3.5} fill="#e0453f" />
        <circle cx={120} cy={120} r={14} fill="none" stroke="#e0453f" strokeWidth={1} opacity={0.5}>
          <animate attributeName="r" values="14;38;14" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div className="min-w-0 flex-1">
        <p className="label-b">System intro</p>
        <h2 className="display glitch mt-2 text-4xl text-ink sm:text-5xl" data-text="WEBQUANT 2099">
          WEBQUANT 2099
        </h2>
        <pre className="mt-6 whitespace-pre-wrap font-mono text-[11px] leading-[1.9] text-mute sm:text-[12px]">
          {LINES.slice(0, shown).map((l) => (
            <span key={l} className="block">
              <span className="text-line2">$ </span>
              {l}
            </span>
          ))}
          {shown < LINES.length && <span className="text-compute">█</span>}
        </pre>
      </div>
    </div>
  );
}
