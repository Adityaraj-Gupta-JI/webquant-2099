import { Link } from 'react-router-dom';
import { Meter } from '../components/Meter';
import { OriginBadge } from '../components/OriginBadge';
import { useAnalysis } from '../hooks/useAnalysis';
import { useAutoRun } from '../hooks/useAutoRun';

const CATEGORY_NOTE: Record<string, string> = {
  volatility: 'How large a normal adverse move is, from realised price dispersion.',
  drawdown: 'The worst peak-to-trough decline observed in the analysis window.',
  valuation: 'How much future execution is already priced into the multiple.',
  concentration: 'How much of the portfolio already sits in this sector.',
  event: 'Discrete external events that could reprice the asset.',
  exposure: 'Balance-sheet and tolerance mismatches specific to this holding.',
};

export function Risk() {
  const { state } = useAnalysis();
  useAutoRun();
  const result = state.result;

  if (!result) {
    return (
      <div className="mx-auto max-w-[70ch] px-5 py-28 sm:px-8">
        <p className="label-b">Risk</p>
        <h1 className="display mt-3 text-4xl text-ink">Nothing to stress yet.</h1>
        <p className="mt-4 text-mute">
          Risk is scored from a completed analysis, not from a static template.
        </p>
        <Link to="/analyze" className="btn-primary mt-8">
          Run an analysis
        </Link>
      </div>
    );
  }

  const { risk, quant, asset } = result;

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label-b">Risk intelligence · {asset.ticker}</p>
          <h1 className="display mt-2 text-4xl text-ink">Why this is risky</h1>
        </div>
        <OriginBadge origin={result.origin} />
      </div>

      <div className="mt-8 grid gap-px bg-line lg:grid-cols-[320px_1fr]">
        <div className="bg-panel p-6">
          <p className="label">Risk index</p>
          <p className="num display mt-3 text-7xl leading-none text-warn">{risk.index}</p>
          <p className="label-b mt-2">{risk.band}</p>
          <Meter value={risk.index} tone="warn" segments={24} className="mt-5" />
          <p className="mt-5 text-[13px] leading-relaxed text-mute">
            A severity-weighted mean of every detected factor, tilted toward the single worst
            one — a portfolio does not average its way out of one large exposure.
          </p>
        </div>

        <div className="bg-panel p-6">
          <p className="label">Contributors</p>
          <div className="mt-4 space-y-4">
            {risk.contributors.map((c) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
                    {c.label}
                  </span>
                  <span className="num font-mono text-[12px] text-warn">{c.score}</span>
                </div>
                <Meter value={c.score} tone="warn" segments={28} className="mt-1.5" />
                <p className="mt-1.5 text-[13px] text-dim">{CATEGORY_NOTE[c.category]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <p className="label-b">Detected factors</p>
        <ul className="mt-4 grid gap-px bg-line md:grid-cols-2">
          {risk.factors
            .slice()
            .sort((a, b) => b.severity - a.severity)
            .map((f) => (
              <li key={f.id} className="bg-panel p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-medium text-ink">{f.label}</p>
                  <span className="num shrink-0 font-mono text-[11px] text-warn">{f.severity}</span>
                </div>
                <p className="label mt-1">{f.category}</p>
                <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-mute">{f.detail}</p>
              </li>
            ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Annualised volatility', `${quant.metrics.annualVol}%`],
          ['Max drawdown', `${quant.metrics.maxDrawdown}%`],
          ['RSI (14)', `${quant.metrics.rsi14}`],
          ['20-day momentum', `${quant.metrics.momentum20}%`],
        ].map(([k, v]) => (
          <div key={k} className="bg-panel p-5">
            <p className="label">{k}</p>
            <p className="num display mt-2 text-3xl leading-none text-ink">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <p className="label-b">What would change this</p>
        <ul className="mt-4 space-y-3">
          {result.invalidators.map((t, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-mute">
              <span className="mt-[10px] h-px w-4 shrink-0 bg-line2" />
              <span className="max-w-[76ch]">{t}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
