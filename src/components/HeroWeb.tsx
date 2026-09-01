import { AGENT_COLOR, Spider } from './Spider';
import type { AgentId } from '../types';

/** A radial web drawn once. Spiders traverse real paths via <animateMotion>,
 *  so the browser compositor does the work — no per-frame React renders. */
const RINGS = [58, 104, 150, 196];
const SPOKES = 12;
const CX = 220;
const CY = 220;

const pt = (i: number, r: number) => {
  const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;
};

const ringPath = (r: number) => {
  const pts = Array.from({ length: SPOKES }, (_, i) => pt(i, r));
  return `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';
};

const TRAVELLERS: { id: AgentId; spoke: number; dur: number; from: number }[] = [
  { id: 'market', spoke: 1, dur: 6, from: 0.18 },
  { id: 'fundamental', spoke: 5, dur: 9, from: 0.62 },
  { id: 'news', spoke: 8, dur: 7.4, from: 0.35 },
  { id: 'risk', spoke: 10, dur: 11, from: 0.8 },
];

export function HeroWeb() {
  return (
    <svg
      viewBox="0 0 440 440"
      className="h-full w-full"
      role="img"
      aria-label="Radial financial web with analytical agents traversing its strands"
    >
      <defs>
        {TRAVELLERS.map((t) => {
          const [x, y] = pt(t.spoke, 200);
          return (
            <path key={t.id} id={`spoke-${t.id}`} d={`M ${CX} ${CY} L ${x} ${y}`} />
          );
        })}
        <radialGradient id="heroFade">
          <stop offset="0%" stopColor="#e0453f" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#e0453f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r={210} fill="url(#heroFade)" />

      {Array.from({ length: SPOKES }, (_, i) => {
        const [x, y] = pt(i, 204);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="#33333d"
            strokeWidth={i % 3 === 0 ? 1 : 0.6}
          />
        );
      })}

      {RINGS.map((r, ri) => (
        <path
          key={r}
          d={ringPath(r)}
          fill="none"
          stroke={ri === 1 ? '#3ec8d8' : '#2b2b34'}
          strokeOpacity={ri === 1 ? 0.35 : 1}
          strokeWidth={0.8}
        />
      ))}

      {RINGS.flatMap((r, ri) =>
        Array.from({ length: SPOKES }, (_, i) => {
          const [x, y] = pt(i, r);
          const lit = (i + ri) % 5 === 0;
          return (
            <circle
              key={`${r}-${i}`}
              cx={x}
              cy={y}
              r={lit ? 2.2 : 1.2}
              fill={lit ? '#3ec8d8' : '#3a3a45'}
            >
              {lit && (
                <animate
                  attributeName="opacity"
                  values="0.25;1;0.25"
                  dur={`${3 + (i % 4)}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          );
        }),
      )}

      <circle cx={CX} cy={CY} r={26} fill="#0b0b0e" stroke="#e0453f" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={5} fill="#e0453f" />
      <circle cx={CX} cy={CY} r={26} fill="none" stroke="#e0453f" strokeWidth={1} opacity={0.5}>
        <animate attributeName="r" values="26;46;26" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="4s" repeatCount="indefinite" />
      </circle>

      {TRAVELLERS.map((t) => (
        <g key={t.id}>
          <g transform="translate(-7,-5)">
            <Spider agentId={t.id} size={14} state="processing" />
          </g>
          <animateMotion
            dur={`${t.dur}s`}
            repeatCount="indefinite"
            keyPoints={`${t.from};0.95;${t.from}`}
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
          >
            <mpath href={`#spoke-${t.id}`} />
          </animateMotion>
        </g>
      ))}

      {TRAVELLERS.map((t) => {
        const [x, y] = pt(t.spoke, 204);
        return <circle key={`c-${t.id}`} cx={x} cy={y} r={3} fill={AGENT_COLOR[t.id]} />;
      })}
    </svg>
  );
}
