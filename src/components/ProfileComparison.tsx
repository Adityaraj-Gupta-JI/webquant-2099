import { useEffect, useState } from 'react';
import { investorAgent } from '../agents/investorAgent';
import { STANCE_LABEL } from '../agents/shared';
import { computeConvergence, synthesisAgent } from '../agents/synthesisAgent';
import type { AgentResult, AnalysisResult, InvestorProfile } from '../types';
import { Meter } from './Meter';

/** ── R4 proof ────────────────────────────────────────────────────────────────
 *  Identical market input, two stored profiles, computed side by side.
 *  The market data, quant metrics and the market/fundamental/news agents are
 *  the *same objects* in both columns — only the investor context differs, so
 *  any divergence in the result provably comes from the profile.             */

const PROFILE_A: InvestorProfile = {
  riskTolerance: 'conservative',
  horizon: 'short',
  allocation: { IT: 58, Banking: 20, Energy: 14, Other: 8 },
};

const PROFILE_B: InvestorProfile = {
  riskTolerance: 'aggressive',
  horizon: 'long',
  allocation: { IT: 18, Banking: 22, Energy: 15, Other: 45 },
};

interface Outcome {
  profile: InvestorProfile;
  investor: AgentResult;
  synthesis: AgentResult;
  convergence: number;
}

/** Re-runs only the profile-dependent part of the pipeline. Everything upstream
 *  is reused verbatim, which is what makes this a controlled comparison. */
async function evaluate(result: AnalysisResult, profile: InvestorProfile): Promise<Outcome> {
  const upstream = result.agents.filter((a) => a.agentId !== 'investor');
  const ctx = {
    asset: result.asset,
    quant: result.quant,
    profile,
    news: [],
    rag: result.rag ?? undefined,
    upstream,
  };
  const investor = await investorAgent.run(ctx);
  const agents = [...upstream, investor];
  const synthesis = await synthesisAgent.run({ ...ctx, upstream: agents });
  return { profile, investor, synthesis, convergence: computeConvergence(agents) };
}

export function ProfileComparison({ result }: { result: AnalysisResult }) {
  const outcomes = useOutcomes(result);
  if (!outcomes) {
    return <p className="font-mono text-[11px] text-dim">Evaluating both profiles…</p>;
  }
  const [a, b] = outcomes;
  const delta = b.synthesis.signal - a.synthesis.signal;

  return (
    <div>
      <p className="max-w-[78ch] text-[15px] leading-relaxed text-mute">
        The same {result.asset.ticker} market data, quant metrics and market/fundamental/news
        agent outputs feed both columns. Only the stored investor profile differs, so the
        gap below is attributable to investor context alone — the underlying market data is
        not touched.
      </p>

      <div className="mt-6 grid gap-px bg-line lg:grid-cols-2">
        {[a, b].map((o, i) => (
          <div key={i} className="bg-panel p-5">
            <p className="label">Profile {i === 0 ? 'A' : 'B'}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              {o.profile.riskTolerance} · {o.profile.horizon} horizon ·{' '}
              {o.profile.allocation[result.asset.sector] ?? 0}% in {result.asset.sector}
            </p>
            <p
              className="num display mt-4 text-6xl leading-none"
              style={{ color: i === 0 ? '#d9a441' : '#3ec8d8' }}
            >
              {o.synthesis.signal}
            </p>
            <p className="label-b mt-2">{STANCE_LABEL[o.synthesis.stance]}</p>
            <Meter
              value={o.synthesis.signal}
              tone={i === 0 ? 'warn' : 'compute'}
              segments={24}
              className="mt-4"
            />
            <dl className="mt-4 space-y-1 border-t border-line pt-3 font-mono text-[11px]">
              {[
                ['Investor agent', `${o.investor.signal}/100`],
                ['Personalised stance', STANCE_LABEL[o.investor.stance]],
                ['Convergence', `${o.convergence}/100`],
                ['Confidence', `${Math.round(o.synthesis.confidence * 100)}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line py-1">
                  <dt className="uppercase tracking-[0.12em] text-dim">{k}</dt>
                  <dd className="num text-mute">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-mute">
              {o.investor.reasoning.map((r, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-line2">—</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p
        className={`mt-4 border p-4 text-[15px] leading-relaxed ${
          Math.abs(delta) >= 3
            ? 'border-compute/40 bg-compute/[0.04] text-ink'
            : 'border-line bg-panel text-mute'
        }`}
      >
        {Math.abs(delta) >= 3 ? (
          <>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-compute">
              Personalisation verified ·{' '}
            </span>
            Identical market input produces a{' '}
            <span className="num">{Math.abs(delta)}</span>-point difference
            {a.synthesis.stance !== b.synthesis.stance && (
              <> and a different stance ({STANCE_LABEL[a.synthesis.stance]} vs{' '}
              {STANCE_LABEL[b.synthesis.stance]})</>
            )}{' '}
            between the two stored profiles.
          </>
        ) : (
          <>
            The two profiles land within {Math.abs(delta)} points here. On this asset the
            investor context is not the binding constraint — which is itself a result, not a
            failure to personalise.
          </>
        )}
      </p>
    </div>
  );
}

/** The agents are async by signature even though they do no I/O, so the two
 *  outcomes are resolved in an effect and stored. `cancelled` guards against a
 *  result change landing after unmount. */
function useOutcomes(result: AnalysisResult): [Outcome, Outcome] | null {
  const [outcomes, setOutcomes] = useState<[Outcome, Outcome] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([evaluate(result, PROFILE_A), evaluate(result, PROFILE_B)]).then((r) => {
      if (!cancelled) setOutcomes(r as [Outcome, Outcome]);
    });
    return () => {
      cancelled = true;
    };
  }, [result]);

  return outcomes;
}
