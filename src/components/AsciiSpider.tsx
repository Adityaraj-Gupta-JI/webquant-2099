import { memo } from 'react';

/** Ambient ASCII spiders. Purely atmospheric — they carry no analysis state,
 *  sit behind the content at very low opacity, and never take pointer events.
 *  Motion is CSS-only (transform/opacity), so nothing re-renders per frame. */

const HANG = `   |
   |
  / \\
 (o.o)
 /|_|\\`;

const SWING = `  \\
   \\
  (o.o)
 /| |\\`;

const CRAWL = ` \\>(o.o)</`;

interface Swinger {
  /** % from the left edge of the container. */
  left: number;
  /** Length of the silk thread above the body, in px. */
  thread: number;
  /** Seconds for one full pendulum cycle. */
  period: number;
  /** Phase offset so no two swing in lockstep. */
  delay: number;
  frame: string;
}

const SWINGERS: Swinger[] = [
  { left: 12, thread: 96, period: 7.5, delay: 0, frame: HANG },
  { left: 63, thread: 148, period: 11, delay: -3.2, frame: SWING },
  { left: 86, thread: 62, period: 9.25, delay: -5.8, frame: HANG },
];

export const AsciiSpider = memo(function AsciiSpider({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {SWINGERS.map((s, i) => (
        <div
          key={i}
          className="ascii-swing absolute top-0"
          style={{
            left: `${s.left}%`,
            animationDuration: `${s.period}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {/* Silk thread — the pendulum's arm, so it rotates with the body. */}
          <span
            className="block w-px bg-signal/20"
            style={{ height: s.thread }}
          />
          <pre className="ascii-body -mt-px whitespace-pre font-mono text-[11px] leading-[1.05]">
            {s.frame}
          </pre>
        </div>
      ))}

      {/* One crawler traversing the top edge. Traversal and step-bob are on
          separate elements — two animations cannot share `transform`. */}
      <div className="ascii-crawl absolute top-2 left-0">
        <pre className="whitespace-pre font-mono text-[11px] leading-none">{CRAWL}</pre>
      </div>
    </div>
  );
});
