import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_PROFILE } from '../data/profiles';
import { INITIAL_STATE, runSpiderSense, type OrchestratorState } from '../lib/spiderSense';
import {
  clearSession,
  loadSession,
  metricsFrom,
  recordSession,
  saveProfile,
  toggleWatchlist,
  type PersistedSession,
} from '../session/store';
import type { InvestorProfile } from '../types';

interface Ctx {
  state: OrchestratorState;
  profile: InvestorProfile;
  ticker: string;
  setProfile: (p: InvestorProfile) => void;
  setTicker: (t: string) => void;
  run: (ticker: string, profile: InvestorProfile, opts?: { instant?: boolean }) => Promise<void>;
  reset: () => void;
  running: boolean;
  session: PersistedSession;
  toggleWatch: (ticker: string) => void;
  clearHistory: () => void;
}

const AnalysisContext = createContext<Ctx | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrchestratorState>(INITIAL_STATE);
  // Restored from localStorage, so a refresh keeps the profile and watchlist.
  const [session, setSession] = useState<PersistedSession>(() => {
    const loaded = loadSession(DEFAULT_PROFILE);
    return Object.keys(loaded.profile.allocation).length
      ? loaded
      : { ...loaded, profile: DEFAULT_PROFILE };
  });
  const [profile, setProfileState] = useState<InvestorProfile>(() => {
    const loaded = loadSession(DEFAULT_PROFILE);
    return Object.keys(loaded.profile.allocation).length ? loaded.profile : DEFAULT_PROFILE;
  });
  const [ticker, setTicker] = useState('RELIANCE');
  const [running, setRunning] = useState(false);

  const setProfile = useCallback((p: InvestorProfile) => {
    setProfileState(p);
    setSession((s) => saveProfile(p, s));
  }, []);

  const run = useCallback(
    async (t: string, p: InvestorProfile, opts?: { instant?: boolean }) => {
      setRunning(true);
      setTicker(t.toUpperCase());
      setProfile(p);
      setState({ ...INITIAL_STATE, phase: 'initializing' });
      const started = Date.now();
      const result = await runSpiderSense(t, p, setState, { paced: !opts?.instant });
      if (result) {
        const metrics = metricsFrom(result, Date.now() - started);
        setSession((s) => recordSession(metrics, s));
      }
      setRunning(false);
    },
    [setProfile],
  );

  const toggleWatch = useCallback((ticker: string) => {
    setSession((s) => toggleWatchlist(ticker, s));
  }, []);

  const clearHistory = useCallback(() => {
    clearSession();
    setSession((s) => ({ ...s, history: [], interactions: [] }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const value = useMemo(
    () => ({
      state, profile, ticker, setProfile, setTicker, run, reset, running,
      session, toggleWatch, clearHistory,
    }),
    [state, profile, ticker, setProfile, run, reset, running, session, toggleWatch, clearHistory],
  );
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): Ctx {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  return ctx;
}
