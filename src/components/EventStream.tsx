import { useEffect, useRef } from 'react';
import type { OrchestratorEvent } from '../types';

const LEVEL = {
  info: 'text-mute',
  signal: 'text-compute',
  warn: 'text-warn',
} as const;

const time = (t: number) =>
  new Date(t).toLocaleTimeString('en-GB', { hour12: false });

export function EventStream({ events, height = 'h-64' }: { events: OrchestratorEvent[]; height?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [events.length]);

  return (
    <div
      ref={ref}
      className={`${height} overflow-y-auto border border-line bg-void p-3 font-mono text-[11px] leading-[1.7]`}
      role="log"
      aria-live="polite"
      aria-label="Orchestrator event stream"
    >
      {events.length === 0 && <p className="text-dim">Awaiting dispatch…</p>}
      {events.map((e) => (
        <div key={e.id} className="flex gap-2">
          <span className="shrink-0 text-line2">[{time(e.at)}]</span>
          <span className={LEVEL[e.level]}>{e.message}</span>
        </div>
      ))}
    </div>
  );
}
