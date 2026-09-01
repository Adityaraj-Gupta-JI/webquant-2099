import type { AgentId } from '../types';

/** Original 8-bit spider glyphs. Drawn from a compact bitmap so every agent
 *  reads as the same species with a distinct silhouette — no external art. */
const BODIES: Record<AgentId, string[]> = {
  //  '#' body · 'o' eye · '/' leg
  market: [
    '..//..//..',
    './######/.',
    './#o##o#/.',
    '..######..',
    '../####/..',
    '..//..//..',
  ],
  fundamental: [
    './/....//.',
    './######/.',
    '.#o####o#.',
    './######/.',
    '..######..',
    './/....//.',
  ],
  news: [
    '../#..#/..',
    './######/.',
    '.#o####o#.',
    '..######..',
    './#####/..',
    './/...//..',
  ],
  risk: [
    '//......//',
    './######/.',
    './#o##o#/.',
    './######/.',
    '../####/..',
    '//......//',
  ],
  investor: [
    '..//..//..',
    './######/.',
    '.#o####o#.',
    '..######..',
    '..######..',
    '..//..//..',
  ],
  synthesis: [
    '/..////..\\',
    './######/.',
    '#o######o#',
    './######/.',
    './######/.',
    '/../..\\..\\',
  ],
};

export const AGENT_COLOR: Record<AgentId, string> = {
  market: '#3ec8d8',
  fundamental: '#8fb3c9',
  news: '#c9a86a',
  risk: '#d9a441',
  investor: '#9d8fc9',
  synthesis: '#e0453f',
};

interface Props {
  agentId: AgentId;
  size?: number;
  state?: 'idle' | 'searching' | 'processing' | 'complete' | 'warning';
  className?: string;
}

/** Renders as an inline SVG group of ≤32 rects — cheap enough to animate. */
export function Spider({ agentId, size = 14, state = 'idle', className }: Props) {
  const rows = BODIES[agentId];
  const cols = rows[0].length;
  const color = AGENT_COLOR[agentId];
  const eye = state === 'warning' ? '#e0453f' : '#08080a';
  const opacity = state === 'idle' ? 0.6 : 1;

  return (
    <svg
      width={size}
      height={(size / cols) * rows.length}
      viewBox={`0 0 ${cols} ${rows.length}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <g opacity={opacity}>
        {rows.map((row, y) =>
          row.split('').map((ch, x) => {
            if (ch === '.') return null;
            const isLeg = ch === '/' || ch === '\\';
            const isEye = ch === 'o';
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={isEye ? eye : color}
                opacity={isLeg ? 0.55 : 1}
              />
            );
          }),
        )}
      </g>
      {state === 'processing' && (
        <rect x={0} y={rows.length} width={cols} height={0.4} fill={color} opacity={0.5}>
          <animate
            attributeName="opacity"
            values="0.1;0.6;0.1"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </rect>
      )}
      <title>{`${agentId} agent — ${state}`}</title>
    </svg>
  );
}
