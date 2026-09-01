import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Meter } from '../components/Meter';
import { ProfileComparison } from '../components/ProfileComparison';
import { marketData } from '../data/providers';
import { HORIZON_LABELS, RISK_LABELS } from '../data/profiles';
import { useAnalysis } from '../hooks/useAnalysis';
import { useAutoRun } from '../hooks/useAutoRun';

export function Portfolio() {
  const { profile, setProfile, state, session, toggleWatch } = useAnalysis();
  useAutoRun();
  const universe = marketData.list();
  const result = state.result;
  const entries = Object.entries(profile.allocation);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
      <p className="label-b">Investor context</p>
      <h1 className="display mt-2 text-4xl text-ink">Your context changes the answer</h1>
      <p className="mt-4 max-w-[70ch] text-[16px] leading-relaxed text-mute">
        WEBQUANT holds no accounts and connects to no broker. This is a simulated profile —
        but it is a real input: the Investor Context agent re-weights the market view by your
        horizon and deducts for concentration and volatility beyond your stated tolerance.
      </p>

      <div className="mt-10 grid gap-px bg-line lg:grid-cols-2">
        <div className="bg-panel p-6">
          <p className="label">Allocation</p>
          <div className="mt-5 space-y-4">
            {entries.map(([sector, pct]) => (
              <div key={sector}>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
                    {sector}
                  </span>
                  <span className="num font-mono text-[12px] text-mute">{pct}%</span>
                </div>
                <Meter
                  value={pct}
                  tone={pct > 25 ? 'signal' : 'compute'}
                  segments={25}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-dim">
            Any sector above 25% triggers a concentration penalty in the personalised signal.
          </p>
        </div>

        <div className="bg-panel p-6">
          <p className="label">Profile</p>
          <div className="mt-5 space-y-6">
            <div>
              <p className="label-b">Risk tolerance</p>
              <div className="mt-2 flex flex-wrap gap-px bg-line">
                {(['conservative', 'moderate', 'aggressive'] as const).map((t) => (
                  <button
                    key={t}
                    aria-pressed={profile.riskTolerance === t}
                    onClick={() => setProfile({ ...profile, riskTolerance: t })}
                    className={`bg-panel2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      profile.riskTolerance === t ? 'text-signal' : 'text-dim hover:text-mute'
                    }`}
                  >
                    {RISK_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label-b">Horizon</p>
              <div className="mt-2 flex flex-col gap-px bg-line">
                {(['short', 'medium', 'long'] as const).map((h) => (
                  <button
                    key={h}
                    aria-pressed={profile.horizon === h}
                    onClick={() => setProfile({ ...profile, horizon: h })}
                    className={`bg-panel2 px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      profile.horizon === h ? 'text-signal' : 'text-dim hover:text-mute'
                    }`}
                  >
                    {HORIZON_LABELS[h]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-dim">
            Changing the profile takes effect on the next analysis run.
          </p>
        </div>
      </div>

      {/* Watchlist — persisted to this browser, part of R5's required state. */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="label-b">Watchlist</p>
          <p className="label">{session.watchlist.length} tracked · saved locally</p>
        </div>
        <div className="mt-4 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {universe.map((a) => {
            const watched = session.watchlist.includes(a.ticker);
            const seen = session.interactions.find((i) => i.ticker === a.ticker);
            return (
              <button
                key={a.ticker}
                onClick={() => toggleWatch(a.ticker)}
                aria-pressed={watched}
                className="group bg-panel p-4 text-left transition-colors hover:bg-panel2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink">
                    {a.ticker}
                  </span>
                  {watched ? (
                    <Eye size={14} className="text-compute" />
                  ) : (
                    <EyeOff size={14} className="text-dim group-hover:text-mute" />
                  )}
                </div>
                <p className="label mt-2">{a.sector}</p>
                <p className="mt-2 text-[12px] text-dim">
                  {seen ? `analysed ${seen.count}x` : 'not yet analysed'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {result ? (
        <section className="mt-12 grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-panel p-6">
            <p className="label">Market view · {result.asset.ticker}</p>
            <p className="num display mt-3 text-6xl leading-none text-ink">{result.marketSignal}</p>
            <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-mute">
              The asset judged in isolation, from price behaviour and financial health.
            </p>
          </div>
          <div className="bg-panel p-6">
            <p className="label">Your context</p>
            <p className="num display mt-3 text-6xl leading-none text-signal">
              {result.personalSignal}
            </p>
            <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-mute">
              After horizon re-weighting, a {result.profile.allocation[result.asset.sector] ?? 0}%
              existing {result.asset.sector} position and your volatility tolerance.
            </p>
          </div>
        </section>
      ) : (
        <Link to="/analyze" className="btn-ghost mt-12">
          Run an analysis to compare
        </Link>
      )}

      {result && (
        <section className="mt-14">
          <p className="label-b">Same input, two stored profiles</p>
          <h2 className="display mt-2 text-2xl text-ink">Personalisation, proven</h2>
          <div className="mt-5">
            <ProfileComparison result={result} />
          </div>
        </section>
      )}
    </div>
  );
}
