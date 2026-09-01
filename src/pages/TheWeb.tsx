import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Route as RouteIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AsciiSpider } from '../components/AsciiSpider';
import { EventStream } from '../components/EventStream';
import { OriginBadge } from '../components/OriginBadge';
import { AGENT_COLOR } from '../components/Spider';
import { WebCanvas } from '../components/WebCanvas';
import { useAnalysis } from '../hooks/useAnalysis';
import { useAutoRun } from '../hooks/useAutoRun';
import { buildGraph, buildTrails } from '../lib/graph';
import type { AgentId } from '../types';

const LEGEND: { label: string; hint: string; swatch: string }[] = [
  { label: 'Thick edge', hint: 'strong contribution', swatch: '#3ec8d8' },
  { label: 'Faded edge', hint: 'low confidence', swatch: '#2b6b73' },
  { label: 'Dashed red', hint: 'contradicting evidence', swatch: '#e0453f' },
  { label: 'Amber node', hint: 'risk factor', swatch: '#d9a441' },
  { label: 'Document', hint: 'retrieved source', swatch: '#8fb3c9' },
];

export function TheWeb() {
  const { state } = useAnalysis();
  useAutoRun();
  const result = state.result;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trailIdx, setTrailIdx] = useState<number | null>(null);
  const [step, setStep] = useState(0);

  const graph = useMemo(() => (result ? buildGraph(result) : null), [result]);
  const trails = useMemo(
    () => (result && graph ? buildTrails(result, graph) : []),
    [result, graph],
  );

  if (!result || !graph) {
    return (
      <div className="mx-auto max-w-[70ch] px-5 py-28 sm:px-8">
        <p className="label-b">The web</p>
        <h1 className="display mt-3 text-4xl text-ink">No web has been spun yet.</h1>
        <p className="mt-4 text-mute">
          The graph is generated from live analysis state — there is nothing decorative to
          show until an analysis has run.
        </p>
        <Link to="/analyze" className="btn-primary mt-8">
          Run an analysis
        </Link>
      </div>
    );
  }

  const activeAgents = result.agents.map((a) => a.agentId) as AgentId[];
  const trail = trailIdx !== null ? trails[trailIdx] : null;
  const trailIds = trail ? trail.map((s) => s.nodeId) : null;
  const activeStep = trail?.[step] ?? null;
  const selected = graph.nodes.find((n) => n.id === (activeStep?.nodeId ?? selectedId)) ?? null;

  const startTrail = (i: number) => {
    setTrailIdx(i);
    setStep(0);
    setSelectedId(null);
  };
  const endTrail = () => {
    setTrailIdx(null);
    setStep(0);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label-b">Financial evidence web</p>
          <h1 className="display mt-2 text-3xl text-ink">
            {result.asset.ticker}
            <span className="ml-3 font-mono text-sm font-normal tracking-normal text-mute">
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </span>
          </h1>
        </div>
        <OriginBadge origin={result.origin} />
      </div>

      <div className="mt-6 grid gap-px bg-line lg:grid-cols-[1fr_360px]">
        <div className="relative bg-void">
          <AsciiSpider />
          {/* On narrow screens the graph gets a minimum canvas and scrolls
              horizontally rather than shrinking into illegibility. */}
          <div className="w-full overflow-x-auto">
            <div className="aspect-[11/9] w-full min-w-[560px]">
              <WebCanvas
                graph={graph}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (id) endTrail();
                }}
                trailIds={trailIds}
                activeAgents={activeAgents}
                riskIndex={result.risk.index}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 hidden gap-4 sm:flex">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
                <span className="h-[2px] w-4" style={{ background: l.swatch }} />
                {l.hint}
              </span>
            ))}
          </div>
        </div>

        {/* Inspector */}
        <aside className="bg-panel p-5">
          {trail ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="label-b text-compute">Follow the web</span>
                <button onClick={endTrail} aria-label="Exit trail" className="text-dim hover:text-ink">
                  <X size={15} />
                </button>
              </div>
              <p className="num mt-4 font-mono text-[11px] text-dim">
                Step {step + 1} / {trail.length}
              </p>
              <h2 className="display mt-2 text-xl text-ink">{activeStep?.title}</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-mute">{activeStep?.body}</p>
              <div className="mt-6 flex gap-2">
                <button
                  className="btn-ghost flex-1 py-2"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ChevronLeft size={13} /> Back
                </button>
                <button
                  className="btn-primary flex-1 py-2"
                  onClick={() => setStep((s) => Math.min(trail.length - 1, s + 1))}
                  disabled={step === trail.length - 1}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
              <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-dim">
                Each step highlights one strand of the graph: raw evidence → the agent that
                read it → the weight it carried into the 2099 synthesis.
              </p>
            </div>
          ) : selected ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">{selected.type}</p>
                  <h2 className="display mt-2 text-xl leading-tight text-ink">{selected.label}</h2>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label="Close inspector"
                  className="text-dim hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>
              {selected.value && (
                <p
                  className="num display mt-4 text-4xl leading-none"
                  style={{ color: selected.agentId ? AGENT_COLOR[selected.agentId] : '#e7e4df' }}
                >
                  {selected.value}
                </p>
              )}
              {selected.detail && (
                <p className="mt-4 text-[14px] leading-relaxed text-mute">{selected.detail}</p>
              )}
              <dl className="mt-5 space-y-1 border-t border-line pt-4 font-mono text-[11px]">
                {[
                  ['Agent', selected.agentId ?? '—'],
                  ['Confidence', selected.confidence ? `${Math.round(selected.confidence * 100)}%` : '—'],
                  [
                    'Contribution',
                    selected.contribution === undefined
                      ? '—'
                      : `${selected.contribution >= 0 ? '+' : ''}${(selected.contribution * 100).toFixed(0)}`,
                  ],
                  ['Timestamp', selected.timestamp?.slice(0, 10) ?? '—'],
                  ['Origin', selected.origin ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-line py-1.5">
                    <dt className="uppercase tracking-[0.12em] text-dim">{k}</dt>
                    <dd className="num text-mute">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div>
              <p className="label-b">Inspector</p>
              <p className="mt-3 text-[14px] leading-relaxed text-mute">
                Select any node to inspect its value, source, confidence and contribution — or
                follow a single strand of evidence end to end.
              </p>
              <p className="label mt-8">Follow the web</p>
              <div className="mt-3 flex flex-col gap-px bg-line">
                {trails.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => startTrail(i)}
                    className="group flex items-center gap-3 bg-panel2 px-3 py-3 text-left transition-colors hover:bg-line"
                  >
                    <RouteIcon size={13} className="shrink-0 text-compute" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
                        {(t.find((s) => s.title.startsWith('Agent · '))?.title ?? t[0].title).replace(
                          'Agent · ',
                          '',
                        )}
                      </span>
                      <span className="block truncate text-[12px] text-dim">
                        {t[0].title.startsWith('Document · ')
                          ? `${t.length} steps · from ${t[0].title.replace('Document · ', '')}`
                          : t[0].title.replace('Evidence · ', '')}
                      </span>
                    </span>
                    <ChevronRight size={13} className="shrink-0 text-dim group-hover:text-ink" />
                  </button>
                ))}
              </div>
              <p className="label mt-8">Event stream</p>
              <div className="mt-3">
                <EventStream events={state.events} height="h-40" />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
