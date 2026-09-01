import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroWeb } from '../components/HeroWeb';

const PILLARS = [
  {
    n: '01',
    k: 'Quant',
    t: 'Deterministic signals',
    d: 'RSI, moving averages, momentum, realised volatility and drawdown are computed in pure functions. No model invents a number.',
  },
  {
    n: '02',
    k: 'Agents',
    t: 'Six analytical perspectives',
    d: 'Market, fundamental, news, risk, investor context and synthesis each answer a different question — and are allowed to disagree.',
  },
  {
    n: '03',
    k: 'Risk',
    t: 'What breaks the thesis',
    d: 'Every conclusion ships with the conditions that would invalidate it, scored and traceable back to its evidence.',
  },
];

export function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1280px] gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-24">
        <div>
          <p className="label-b">Multi-agent financial intelligence · v2099.1</p>
          <h1 className="display mt-6 text-[clamp(3.2rem,11vw,7.5rem)] leading-[0.88] text-ink">
            WEB
            <span className="text-signal">QUANT</span>
          </h1>
          <p className="mt-6 max-w-[22ch] font-display text-[clamp(1.5rem,4vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
            Follow the signals.
            <br />
            <span className="text-mute">Understand the risk.</span>
          </p>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-mute">
            Multi-agent financial intelligence that connects market data, quantitative
            signals, retrieved evidence and your own portfolio context — then shows you
            every strand it used to get there.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/analyze" className="btn-primary">
              Enter the web <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <a href="#how" className="btn-ghost">
              View how it works
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
            <span>6 agents</span>
            <span>5 quant metrics</span>
            <span>Evidence-traceable</span>
            <span>Offline-capable demo</span>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          <HeroWeb />
        </div>
      </section>

      {/* Pillars */}
      <section id="how" className="rule">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {PILLARS.map((p) => (
              <article key={p.n} className="py-10 lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-signal">{p.n}</span>
                  <span className="label-b">{p.k}</span>
                </div>
                <h2 className="display mt-4 text-2xl text-ink">{p.t}</h2>
                <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-mute">{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="rule">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
          <p className="label-b">The pipeline</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-4 font-mono text-[11px] uppercase tracking-[0.16em]">
            {['Data', 'Quant core', 'Agents', 'Risk', 'Synthesis', 'Evidence web'].map(
              (s, i, arr) => (
                <span key={s} className="flex items-center gap-3">
                  <span className={i === arr.length - 1 ? 'text-signal' : 'text-mute'}>{s}</span>
                  {i < arr.length - 1 && <span className="text-line2">→</span>}
                </span>
              ),
            )}
          </div>
          <p className="mt-6 max-w-[70ch] text-[15px] leading-relaxed text-mute">
            Prices and fundamentals enter a deterministic quant core. Agents interpret those
            values — they never generate them. Risk is scored separately and can override the
            headline. The web you explore at the end is generated from that exact state.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="rule">
        <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8">
          <h2 className="display max-w-[16ch] text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.95] text-ink">
            The market is a web of signals.
          </h2>
          <Link to="/analyze" className="btn-primary mt-10">
            Start analysis <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </div>
  );
}
