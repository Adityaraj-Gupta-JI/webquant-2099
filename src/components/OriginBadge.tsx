import type { DataOrigin } from '../types';

/** Demo values are never presented as live values. */
export function OriginBadge({ origin, className = '' }: { origin: DataOrigin; className?: string }) {
  const live = origin === 'live';
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
        live ? 'border-compute/40 text-compute' : 'border-warn/40 text-warn'
      } ${className}`}
      title={
        live
          ? 'Sourced from a live market data provider.'
          : 'Deterministic demo dataset — fixed values, not live market data.'
      }
    >
      <span className={`h-1 w-1 ${live ? 'bg-compute' : 'bg-warn'}`} aria-hidden />
      {live ? 'Live data' : 'Demo data'}
    </span>
  );
}
