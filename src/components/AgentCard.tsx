import { AGENT_COLOR, Spider } from './Spider';
import { Meter } from './Meter';
import { STANCE_LABEL } from '../agents/shared';
import type { AgentResult } from '../types';

export function AgentCard({ agent, compact = false }: { agent: AgentResult; compact?: boolean }) {
  const tone =
    agent.signal >= 60 ? 'compute' : agent.signal >= 45 ? 'mute' : 'signal';
  return (
    <div className="panel p-4">
      <div className="flex items-start gap-3">
        <Spider agentId={agent.agentId} size={18} state="complete" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
            {agent.name}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-dim">{agent.question}</p>
        </div>
        <div className="text-right">
          <p className="num display text-2xl leading-none" style={{ color: AGENT_COLOR[agent.agentId] }}>
            {agent.signal}
          </p>
          <p className="label mt-1">{(agent.confidence * 100).toFixed(0)}% conf</p>
        </div>
      </div>
      <Meter value={agent.signal} tone={tone} className="mt-3" segments={16} />
      <p className="label-b mt-2">{STANCE_LABEL[agent.stance]}</p>
      {!compact && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[13px] leading-relaxed text-mute">
          {agent.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-line2">—</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
