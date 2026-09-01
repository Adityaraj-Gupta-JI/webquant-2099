interface Props {
  value: number; // 0..100
  tone?: 'signal' | 'compute' | 'warn' | 'mute';
  segments?: number;
  className?: string;
}

const TONE = {
  signal: 'bg-signal',
  compute: 'bg-compute',
  warn: 'bg-warn',
  mute: 'bg-mute',
} as const;

/** Segmented bar — reads as an instrument, not a progress bar. */
export function Meter({ value, tone = 'compute', segments = 20, className = '' }: Props) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);
  return (
    <div
      className={`flex gap-[2px] ${className}`}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 ${i < filled ? TONE[tone] : 'bg-line'}`}
          style={{ opacity: i < filled ? 0.45 + (i / segments) * 0.55 : 1 }}
        />
      ))}
    </div>
  );
}
