import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysis } from './useAnalysis';

/** Deep link support: any analysis-backed route accepts
 *  `?auto=TICKER` (runs the full pipeline on load) and `&instant=1`
 *  (skips stage pacing). One URL restores a complete demo state.
 *  Returns the requested ticker, if any. */
export function useAutoRun(): string | null {
  const [params] = useSearchParams();
  const { run, profile, state, running } = useAnalysis();
  const started = useRef(false);
  const auto = params.get('auto');
  const instant = params.get('instant') === '1';

  useEffect(() => {
    if (!auto || started.current || running || state.result) return;
    started.current = true;
    void run(auto.toUpperCase(), profile, { instant });
  }, [auto, instant, profile, run, running, state.result]);

  return auto ? auto.toUpperCase() : null;
}
