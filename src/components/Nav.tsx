import { Crosshair } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAnalysis } from '../hooks/useAnalysis';
import { PHASE_LABEL } from '../lib/spiderSense';
import { useVideoModal } from './VideoModalContext';

const LINKS = [
  { to: '/analyze', label: 'Analyze' },
  { to: '/web', label: 'The Web' },
  { to: '/risk', label: 'Risk' },
  { to: '/portfolio', label: 'Portfolio' },
];

export function Nav() {
  const { state, running } = useAnalysis();
  const { openModal } = useVideoModal();
  const { pathname } = useLocation();
  const status =
    state.phase === 'error'
      ? { text: 'System fault', color: 'text-signal', dot: 'bg-signal' }
      : running
        ? { text: PHASE_LABEL[state.phase], color: 'text-compute', dot: 'bg-compute' }
        : { text: 'System online', color: 'text-mute', dot: 'bg-compute' };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/92 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-5 sm:px-8">
        <NavLink to="/" className="group flex items-baseline gap-2 shrink-0">
          <span className="display text-[15px] tracking-[-0.04em] text-ink">WEBQUANT</span>
          <span className="font-mono text-[10px] text-signal">2099</span>
        </NavLink>

        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  isActive || pathname === l.to
                    ? 'border-signal text-ink'
                    : 'border-transparent text-dim hover:text-mute'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={openModal}
            aria-label="Replay intro sequence"
            title="Replay intro sequence"
            className="-m-2 p-2 text-dim transition-colors hover:text-signal"
          >
            <Crosshair size={15} strokeWidth={1.75} />
          </button>
          <span className={`h-1.5 w-1.5 ${status.dot} dot-live`} aria-hidden />
          <span className={`hidden font-mono text-[10px] uppercase tracking-[0.16em] sm:inline ${status.color}`}>
            {status.text}
          </span>
        </div>
      </div>
    </header>
  );
}
