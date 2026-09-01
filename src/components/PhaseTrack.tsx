import { Spider } from './Spider';
import { PHASE_LABEL, PHASE_ORDER } from '../lib/spiderSense';
import type { AgentId, Phase } from '../types';

const PHASE_AGENT: Partial<Record<Phase, AgentId>> = {
  market: 'market',
  fundamental: 'fundamental',
  news: 'news',
  risk: 'risk',
  investor: 'investor',
  synthesis: 'synthesis',
};

/** Reflects real orchestrator phase — never a timed fake. */
export function PhaseTrack({ phase }: { phase: Phase }) {
  const idx = PHASE_ORDER.indexOf(phase);
  return (
    <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
      {PHASE_ORDER.map((p, i) => {
        const done = idx > i || phase === 'complete';
        const active = phase === p && phase !== 'complete';
        const agent = PHASE_AGENT[p];
        return (
          <li
            key={p}
            className={`flex items-center gap-2 bg-panel px-3 py-2.5 transition-colors ${
              active ? 'bg-panel2' : ''
            }`}
            aria-current={active ? 'step' : undefined}
          >
            {agent ? (
              <Spider
                agentId={agent}
                size={14}
                state={active ? 'processing' : done ? 'complete' : 'idle'}
              />
            ) : (
              <span
                className={`h-1.5 w-1.5 shrink-0 ${
                  active ? 'bg-compute dot-live' : done ? 'bg-compute' : 'bg-line2'
                }`}
              />
            )}
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                active ? 'text-compute' : done ? 'text-mute' : 'text-dim'
              }`}
            >
              {PHASE_LABEL[p]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
