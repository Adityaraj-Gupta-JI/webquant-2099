import { AlertTriangle, ArrowRight, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STANCE_LABEL } from '../agents/shared';
import { SYNTHESIS_WEIGHTS } from '../agents/synthesisAgent';
import type { AnalysisResult } from '../types';
import { Citations } from './Citations';
import { SessionMetrics } from './SessionMetrics';
import { AGENT_COLOR } from './Spider';
import { Meter } from './Meter';
import { OriginBadge } from './OriginBadge';

const Section = ({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rule py-8">
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[11px] text-signal">{n}</span>
      <h3 className="label-b">{title}</h3>
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

export function Synthesis({ result }: { result: AnalysisResult }) {
  const s = result.synthesis;
  const tone = s.signal >= 60 ? 'compute' : s.signal >= 45 ? 'warn' : 'signal';
  const strongest = s.evidence.filter((e) => e.polarity > 0).slice(0, 4);
  const against = s.evidence.filter((e) => e.polarity < 0).slice(0, 3);

  return (
    <div>
      {/* Hero result */}
      <div className="grid gap-8 border border-line bg-panel p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-b">2099 Synthesis</span>
            <OriginBadge origin={result.origin} />
          </div>
          <h2 className="display mt-4 text-[clamp(2.4rem,7vw,4.25rem)] leading-[0.92] text-ink">
            {STANCE_LABEL[s.stance]}
          </h2>
          <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-mute">
            {result.asset.name} · {result.asset.exchange} · a research signal derived from{' '}
            {result.agents.length} analytical domains. Not investment advice.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px self-start bg-line">
          {[
            { k: 'Signal', v: `${s.signal}`, sub: '/ 100', color: '#e7e4df' },
            {
              k: 'Confidence',
              v: `${Math.round(s.confidence * 100)}`,
              sub: '%',
              color: '#3ec8d8',
            },
            { k: 'Risk', v: `${result.risk.index}`, sub: result.risk.band, color: '#d9a441' },
          ].map((m) => (
            <div key={m.k} className="bg-panel p-4">
              <p className="label">{m.k}</p>
              <p className="num display mt-2 text-4xl leading-none" style={{ color: m.color }}>
                {m.v}
              </p>
              <p className="label mt-1.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <Section n="01" title="Signal">
        <Meter value={s.signal} tone={tone} segments={40} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <p className="max-w-[60ch] text-[15px] leading-relaxed text-mute">
            {s.reasoning[0]} {s.reasoning[1]}
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[11px]">
            {Object.entries(SYNTHESIS_WEIGHTS).map(([k, w]) => (
              <div key={k} className="flex justify-between border-b border-line py-1">
                <dt className="uppercase tracking-[0.12em] text-dim">{k}</dt>
                <dd className="num text-mute">{Math.round(w * 100)}%</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section n="02" title="Why">
        <ul className="grid gap-px bg-line sm:grid-cols-2">
          {strongest.map((e) => (
            <li key={e.id} className="bg-panel p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[14px] font-medium text-ink">{e.label}</p>
                {e.value && <p className="num font-mono text-[12px] text-compute">{e.value}</p>}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-mute">{e.detail}</p>
              <p className="label mt-3">
                {e.source} · {e.timestamp.slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
        {against.length > 0 && (
          <>
            <p className="label-b mt-6">Evidence against</p>
            <ul className="mt-3 space-y-2">
              {against.map((e) => (
                <li key={e.id} className="flex gap-3 text-[14px] text-mute">
                  <span className="mt-[7px] h-1 w-3 shrink-0 bg-signal" />
                  <span>
                    <span className="text-ink">{e.label}</span>
                    {e.value ? ` (${e.value})` : ''} — {e.detail}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section n="03" title="Sources — retrieval-grounded evidence">
        <Citations result={result} />
      </Section>

      <Section n="04" title="Risk">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="num display text-6xl leading-none text-warn">{result.risk.index}</p>
            <p className="label-b mt-2">{result.risk.band} · risk index</p>
            <div className="mt-5 space-y-2">
              {result.risk.contributors.slice(0, 5).map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
                    <span className="text-dim">{c.label}</span>
                    <span className="num text-mute">{c.score}</span>
                  </div>
                  <Meter value={c.score} tone="warn" segments={14} className="mt-1" />
                </div>
              ))}
            </div>
          </div>
          <ul className="space-y-3">
            {result.risk.factors.slice(0, 5).map((f) => (
              <li key={f.id} className="border-l-2 border-warn/50 pl-4">
                <p className="text-[14px] font-medium text-ink">
                  {f.label} <span className="num font-mono text-[11px] text-warn">{f.severity}</span>
                </p>
                <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-mute">{f.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section n="05" title="Agent convergence">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ul className="space-y-3">
            {result.agents.map((a) => (
              <li key={a.agentId} className="flex items-center gap-4">
                <span className="w-32 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
                  {a.name.split(' ')[0]}
                </span>
                <div className="h-2 flex-1 bg-line">
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{ width: `${a.signal}%`, background: AGENT_COLOR[a.agentId] }}
                  />
                </div>
                <span className="num w-10 text-right font-mono text-[13px] text-ink">{a.signal}</span>
              </li>
            ))}
          </ul>
          <div className="panel p-5">
            <p className="label">Signal convergence</p>
            <p className="num display mt-2 text-5xl leading-none text-compute">
              {result.convergence}
            </p>
            <p className="mt-3 max-w-[38ch] text-[13px] leading-relaxed text-mute">
              How tightly the domains agree. Low convergence lowers the synthesis confidence
              rather than being hidden.
            </p>
          </div>
        </div>
      </Section>

      {result.divergence.detected && (
        <section className="my-8 border border-warn/40 bg-warn/[0.04] p-6">
          <div className="flex items-center gap-2 text-warn">
            <GitBranch size={15} />
            <span className="label-b text-warn">Analytical divergence detected</span>
          </div>
          <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ink">
            {result.divergence.explanation}
          </p>
        </section>
      )}

      <Section n="06" title="Market view vs your context">
        <div className="grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-panel p-5">
            <p className="label">Market view</p>
            <p className="num display mt-2 text-5xl leading-none text-ink">{result.marketSignal}</p>
            <p className="mt-2 text-[13px] text-mute">Asset in isolation.</p>
          </div>
          <div className="bg-panel p-5">
            <p className="label">Your context</p>
            <p className="num display mt-2 text-5xl leading-none text-signal">
              {result.personalSignal}
            </p>
            <p className="mt-2 text-[13px] text-mute">
              {result.profile.riskTolerance} · {result.profile.horizon} horizon ·{' '}
              {result.profile.allocation[result.asset.sector] ?? 0}% already in{' '}
              {result.asset.sector}.
            </p>
          </div>
        </div>
      </Section>

      <Section n="07" title="What could change this">
        <ul className="space-y-3">
          {result.invalidators.map((t, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-mute">
              <AlertTriangle size={14} className="mt-[5px] shrink-0 text-warn" />
              <span className="max-w-[76ch]">{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section n="08" title="Session metrics">
        <SessionMetrics result={result} />
      </Section>

      <div className="flex flex-wrap gap-3 pt-4">
        <Link to="/web" className="btn-primary">
          Open the evidence web <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
        <Link to="/risk" className="btn-ghost">
          Risk breakdown
        </Link>
      </div>
    </div>
  );
}
