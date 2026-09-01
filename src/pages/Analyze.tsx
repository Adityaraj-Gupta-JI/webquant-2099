import { useEffect, useMemo, useState } from 'react';
import { Search, Zap } from 'lucide-react';
import { useState as useStateAlias } from 'react';
import { isCorpusAvailable, setCorpusAvailable } from '../rag/ingest';

import { AgentCard } from '../components/AgentCard';
import { AsciiSpider } from '../components/AsciiSpider';
import { EventStream } from '../components/EventStream';
import { OriginBadge } from '../components/OriginBadge';
import { PhaseTrack } from '../components/PhaseTrack';
import { Synthesis } from '../components/Synthesis';
import { HORIZON_LABELS, RISK_LABELS } from '../data/profiles';
import { marketData } from '../data/providers';
import { useAnalysis } from '../hooks/useAnalysis';
import { useAutoRun } from '../hooks/useAutoRun';
import type { Horizon, RiskTolerance } from '../types';

const TOLERANCES: RiskTolerance[] = ['conservative', 'moderate', 'aggressive'];
const HORIZONS: Horizon[] = ['short', 'medium', 'long'];

export function Analyze() {
  const { state, profile, setProfile, ticker, setTicker, run, running } = useAnalysis();
  const [query, setQuery] = useState(ticker);
  const universe = useMemo(() => marketData.list(), []);
  const [corpusOn, setCorpusOn] = useStateAlias(isCorpusAvailable());
  const result = state.result;

  const start = () => {
    if (!running) void run(query || ticker, profile);
  };

  const auto = useAutoRun();
  useEffect(() => {
    if (auto) setQuery(auto);
  }, [auto]);

  return (
    <div className="relative mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
      <AsciiSpider className="h-[560px]" />
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label-b">Analysis workspace</p>
          <h1 className="display mt-2 text-4xl text-ink">Activate Spider-Sense</h1>
        </div>
        <OriginBadge origin="demo" />
      </div>

      {/* Console */}
      <div className="mt-8 grid gap-px bg-line lg:grid-cols-[1.15fr_1fr]">
        <div className="bg-panel p-6">
          <label htmlFor="ticker" className="label">
            Target asset
          </label>
          <div className="mt-3 flex items-center gap-3 border border-line2 bg-void px-4 py-3 focus-within:border-compute">
            <Search size={15} className="shrink-0 text-dim" />
            <input
              id="ticker"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder="Search asset / ticker…"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-transparent font-mono text-[15px] uppercase tracking-[0.1em] text-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-dim"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {universe.map((a) => (
              <button
                key={a.ticker}
                onClick={() => {
                  setQuery(a.ticker);
                  setTicker(a.ticker);
                }}
                className={`chip transition-colors hover:border-mute hover:text-ink ${
                  query === a.ticker ? 'border-compute text-compute' : ''
                }`}
              >
                {a.ticker}
                <span className="ml-2 text-dim">{a.sector}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <fieldset>
              <legend className="label">Risk tolerance</legend>
              <div className="mt-3 flex flex-col gap-px bg-line">
                {TOLERANCES.map((t) => (
                  <button
                    key={t}
                    aria-pressed={profile.riskTolerance === t}
                    onClick={() => setProfile({ ...profile, riskTolerance: t })}
                    className={`bg-panel2 px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      profile.riskTolerance === t
                        ? 'text-signal'
                        : 'text-dim hover:text-mute'
                    }`}
                  >
                    {RISK_LABELS[t]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Horizon</legend>
              <div className="mt-3 flex flex-col gap-px bg-line">
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    aria-pressed={profile.horizon === h}
                    onClick={() => setProfile({ ...profile, horizon: h })}
                    className={`bg-panel2 px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      profile.horizon === h ? 'text-signal' : 'text-dim hover:text-mute'
                    }`}
                  >
                    {HORIZON_LABELS[h]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* R8 degraded-data scenario, triggerable during a demo. */}
          <label className="mt-8 flex cursor-pointer items-start gap-3 border border-line bg-void p-3">
            <input
              type="checkbox"
              checked={!corpusOn}
              onChange={(e) => {
                setCorpusAvailable(!e.target.checked);
                setCorpusOn(!e.target.checked);
              }}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#d9a441]"
            />
            <span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
                Simulate degraded data
              </span>
              <span className="mt-1 block text-[12px] leading-relaxed text-dim">
                Makes the document corpus unreachable. The pipeline still completes; the
                grounded agent reports insufficient evidence and cites nothing rather than
                producing an uncited claim.
              </span>
            </span>
          </label>

          <button
            onClick={start}
            disabled={running}
            className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap size={14} strokeWidth={2.5} />
            {running ? 'Spider-Sense active…' : 'Activate Spider-Sense'}
          </button>
        </div>

        <div className="bg-panel p-6">
          <p className="label">Orchestration</p>
          <div className="mt-3">
            <PhaseTrack phase={state.phase} />
          </div>
          <p className="label mt-6">Event stream</p>
          <div className="mt-3">
            <EventStream events={state.events} height="h-[292px]" />
          </div>
        </div>
      </div>

      {state.phase === 'error' && (
        <p className="mt-6 border border-signal/50 bg-signal/[0.06] p-4 font-mono text-[12px] text-signal">
          {state.error}
        </p>
      )}

      {state.agents.length > 0 && (
        <section className="mt-14">
          <p className="label-b">Agent results</p>
          <div className="mt-4 grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
            {state.agents.map((a) => (
              <AgentCard key={a.agentId} agent={a} />
            ))}
            {result && <AgentCard agent={result.synthesis} />}
          </div>
        </section>
      )}

      {result && (
        <section className="mt-16">
          <Synthesis result={result} />
        </section>
      )}
    </div>
  );
}
