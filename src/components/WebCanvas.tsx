import { useMemo } from 'react';
import { AGENT_COLOR, Spider } from './Spider';
import { VIEW_H, VIEW_W, edgePath, neighbours } from '../lib/graph';
import type { AgentId, GraphNode, WebGraph } from '../types';

const NODE_FILL: Record<GraphNode['type'], string> = {
  asset: '#0b0b0e',
  agent: '#0b0b0e',
  metric: '#3a3a45',
  evidence: '#3a3a45',
  risk: '#d9a441',
  synthesis: '#0b0b0e',
  document: '#0b0b0e',
};

interface Props {
  graph: WebGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Ids forced into focus (used by Follow the Web); null = no trail. */
  trailIds: string[] | null;
  /** Agents that have completed — drives spider presence. */
  activeAgents: AgentId[];
  /** Higher risk destabilises the edges leaving the risk agent. */
  riskIndex: number;
}

export function WebCanvas({
  graph,
  selectedId,
  onSelect,
  trailIds,
  activeAgents,
  riskIndex,
}: Props) {
  const byId = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph],
  );

  const focus = useMemo(() => {
    if (trailIds?.length) return new Set(trailIds);
    if (selectedId) return neighbours(graph, selectedId);
    return null;
  }, [graph, selectedId, trailIds]);

  const nodeDim = (id: string) => (focus && !focus.has(id) ? 0.16 : 1);
  const edgeDim = (from: string, to: string) => {
    if (!focus) return 1;
    if (trailIds?.length) {
      const i = trailIds.indexOf(from);
      const j = trailIds.indexOf(to);
      return i >= 0 && j >= 0 && Math.abs(i - j) === 1 ? 1 : 0.08;
    }
    return focus.has(from) && focus.has(to) ? 1 : 0.08;
  };

  const unstable = riskIndex >= 60;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full touch-pan-y"
      role="img"
      aria-label="Financial evidence web: asset, agents, metrics, evidence, risks and the 2099 synthesis"
      onClick={() => onSelect(null)}
    >
      <defs>
        {graph.edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          return <path key={e.id} id={`path-${e.id}`} d={edgePath(a, b)} />;
        })}
        <radialGradient id="synthGlow">
          <stop offset="0%" stopColor="#e0453f" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#e0453f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={560} cy={814} r={140} fill="url(#synthGlow)" />

      {/* Edges */}
      <g fill="none">
        {graph.edges.map((e) => {
          const dim = edgeDim(e.from, e.to);
          const negative = e.polarity < -0.05;
          const color = negative ? '#e0453f' : e.agentId ? AGENT_COLOR[e.agentId] : '#3ec8d8';
          const jitter = unstable && e.agentId === 'risk';
          return (
            <use
              key={e.id}
              href={`#path-${e.id}`}
              stroke={color}
              strokeWidth={0.6 + e.weight * 2.4}
              strokeOpacity={(0.16 + e.confidence * 0.5) * dim}
              strokeDasharray={negative ? '5 4' : jitter ? '2 6' : undefined}
              className={jitter ? 'edge-active' : undefined}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {graph.nodes.map((n) => {
          const dim = nodeDim(n.id);
          const stroke =
            n.type === 'asset'
              ? '#e7e4df'
              : n.type === 'synthesis'
                ? '#e0453f'
                : n.type === 'document'
                ? '#8fb3c9'
                : n.type === 'risk'
                  ? '#d9a441'
                  : n.agentId
                    ? AGENT_COLOR[n.agentId]
                    : '#3a3a45';
          const isHub =
            n.type === 'asset' ||
            n.type === 'agent' ||
            n.type === 'synthesis' ||
            n.type === 'document';
          const selected = selectedId === n.id;
          return (
            <g
              key={n.id}
              opacity={dim}
              className="cursor-pointer transition-opacity duration-300 hover:opacity-100 [&:hover>circle]:stroke-ink"
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect(selected ? null : n.id);
              }}
              tabIndex={0}
              role="button"
              aria-label={`${n.type}: ${n.label}${n.value ? `, ${n.value}` : ''}`}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onSelect(selected ? null : n.id);
                }
              }}
            >
              <title>
                {`${n.label}${n.value ? ` — ${n.value}` : ''}${n.detail ? `\n${n.detail}` : ''}`}
              </title>
              {selected && (
                <circle cx={n.x} cy={n.y} r={n.r + 10} fill="none" stroke={stroke} strokeOpacity={0.4} />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={isHub ? NODE_FILL[n.type] : stroke}
                fillOpacity={isHub ? 1 : 0.85}
                stroke={stroke}
                strokeWidth={isHub ? 1.4 : 0}
              />
              {n.type === 'asset' && (
                <>
                  <text
                    x={n.x}
                    y={n.y - 2}
                    textAnchor="middle"
                    className="fill-ink font-display text-[15px] font-semibold"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 13}
                    textAnchor="middle"
                    className="fill-mute font-mono text-[10px]"
                  >
                    {n.value}
                  </text>
                </>
              )}
              {n.type === 'synthesis' && (
                <>
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    className="fill-signal font-display text-[16px] font-semibold"
                  >
                    2099
                  </text>
                  <text
                    x={n.x}
                    y={n.y + n.r + 18}
                    textAnchor="middle"
                    className="fill-mute font-mono text-[11px]"
                  >
                    {n.value}
                  </text>
                </>
              )}
              {n.type === 'document' && (
                <>
                  {/* A small page glyph, so a source is identifiable at a glance. */}
                  <rect
                    x={n.x - 4}
                    y={n.y - 5.5}
                    width={8}
                    height={11}
                    fill="none"
                    stroke="#8fb3c9"
                    strokeWidth={1}
                  />
                  <line x1={n.x - 2} y1={n.y - 2.5} x2={n.x + 2} y2={n.y - 2.5} stroke="#8fb3c9" strokeWidth={0.8} />
                  <line x1={n.x - 2} y1={n.y} x2={n.x + 2} y2={n.y} stroke="#8fb3c9" strokeWidth={0.8} />
                  <line x1={n.x - 2} y1={n.y + 2.5} x2={n.x + 1} y2={n.y + 2.5} stroke="#8fb3c9" strokeWidth={0.8} />
                  <text
                    x={n.x}
                    y={n.y + n.r + 12}
                    textAnchor="middle"
                    className="fill-mute font-mono text-[9px] uppercase"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    {n.value}
                  </text>
                </>
              )}
              {n.type === 'agent' && (
                <>
                  <g transform={`translate(${n.x - 9},${n.y - 8})`}>
                    <Spider
                      agentId={n.agentId as AgentId}
                      size={18}
                      state={activeAgents.includes(n.agentId as AgentId) ? 'complete' : 'idle'}
                    />
                  </g>
                  <text
                    x={n.x}
                    y={n.y - n.r - 10}
                    textAnchor="middle"
                    className="fill-mute font-mono text-[10px] uppercase"
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {n.label.split(' ')[0]}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + n.r + 14}
                    textAnchor="middle"
                    className="fill-ink font-mono text-[11px]"
                  >
                    {n.value}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* Spiders converging on 2099 — one per completed agent. */}
      <g aria-hidden>
        {activeAgents
          .filter((id) => graph.edges.some((e) => e.id === `e-${id}-syn`))
          .map((id, i) => (
            <g key={`sp-${id}`} opacity={focus ? 0.25 : 1}>
              <g transform="translate(-8,-6)">
                <Spider agentId={id} size={16} state="processing" />
              </g>
              <animateMotion
                dur={`${7 + i * 1.6}s`}
                repeatCount="indefinite"
                keyPoints={`${0.1 + i * 0.16};1;${0.1 + i * 0.16}`}
                keyTimes="0;0.55;1"
                calcMode="spline"
                keySplines="0.45 0 0.15 1;0.45 0 0.15 1"
              >
                <mpath href={`#path-e-${id}-syn`} />
              </animateMotion>
            </g>
          ))}
      </g>
    </svg>
  );
}
