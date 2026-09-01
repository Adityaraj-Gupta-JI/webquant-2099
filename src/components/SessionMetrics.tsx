import { useAnalysis } from '../hooks/useAnalysis';
import { riskConcentration } from '../session/store';
import type { AnalysisResult } from '../types';

/** Measured session telemetry. Every number here is observed from this run —
 *  none is a benchmark, and none is a claim about predictive accuracy. */
export function SessionMetrics({ result }: { result: AnalysisResult }) {
  const { session } = useAnalysis();
  const latest = session.history[0];
  const fundamental = result.agents.find((a) => a.agentId === 'fundamental');
  const docClaims = fundamental?.evidence.filter((e) => e.kind === 'document') ?? [];
  const cited = docClaims.filter((e) => e.citation).length;

  const rows: [string, string, string][] = [
    [
      'Total analysis latency',
      latest ? `${latest.totalLatencyMs} ms` : '—',
      'Dispatch to synthesis, including UI stage pacing.',
    ],
    [
      'Agent compute',
      `${result.agents.reduce((a, b) => a + b.durationMs, 0)} ms`,
      `Summed across ${result.agents.length} agents; 3 ran concurrently.`,
    ],
    [
      'Retrieval latency',
      `${result.rag?.result.latencyMs ?? 0} ms`,
      `${result.rag?.result.candidatesConsidered ?? 0} candidates scanned.`,
    ],
    [
      'Chunks retrieved',
      `${result.rag?.result.chunks.length ?? 0}`,
      `From a corpus of ${fundamental?.retrieval?.corpusChunks ?? 0} indexed chunks.`,
    ],
    [
      'Citation coverage',
      docClaims.length ? `${Math.round((cited / docClaims.length) * 100)}%` : 'n/a',
      'Share of document-derived claims carrying a resolvable citation.',
    ],
    [
      'Signal convergence',
      `${result.convergence}/100`,
      'Agreement across the five analytical domains.',
    ],
    [
      'Portfolio concentration',
      `${riskConcentration(result.profile.allocation)}/100`,
      'Normalised Herfindahl index of the sector allocation.',
    ],
    [
      'Data source status',
      result.origin === 'live' ? 'LIVE' : 'DEMO',
      `Retrieval: ${result.rag?.result.status ?? 'NOT_RUN'}.`,
    ],
  ];

  return (
    <div>
      <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value, note]) => (
          <div key={label} className="bg-panel p-4">
            <p className="label">{label}</p>
            <p className="num display mt-2 text-2xl leading-none text-ink">{value}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-dim">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
        {result.agents.map((a) => (
          <span key={a.agentId}>
            {a.agentId} <span className="num text-mute">{a.durationMs}ms</span>
          </span>
        ))}
      </div>

      {session.history.length > 1 && (
        <div className="mt-6">
          <p className="label">Session history · {session.history.length} analyses</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-line text-left text-dim">
                  <th className="py-1.5 pr-4 font-normal uppercase tracking-[0.12em]">Ticker</th>
                  <th className="py-1.5 pr-4 font-normal uppercase tracking-[0.12em]">Signal</th>
                  <th className="py-1.5 pr-4 font-normal uppercase tracking-[0.12em]">Conv</th>
                  <th className="py-1.5 pr-4 font-normal uppercase tracking-[0.12em]">Chunks</th>
                  <th className="py-1.5 pr-4 font-normal uppercase tracking-[0.12em]">Latency</th>
                  <th className="py-1.5 font-normal uppercase tracking-[0.12em]">At</th>
                </tr>
              </thead>
              <tbody>
                {session.history.slice(0, 8).map((h, i) => (
                  <tr key={`${h.ticker}-${i}`} className="border-b border-line/60 text-mute">
                    <td className="py-1.5 pr-4 text-ink">{h.ticker}</td>
                    <td className="num py-1.5 pr-4">{h.signal}</td>
                    <td className="num py-1.5 pr-4">{h.convergence}</td>
                    <td className="num py-1.5 pr-4">{h.chunksRetrieved}</td>
                    <td className="num py-1.5 pr-4">{h.totalLatencyMs}ms</td>
                    <td className="num py-1.5 text-dim">{h.completedAt.slice(11, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-dim">
            Persisted to this browser only. No account, no server, no personal data.
          </p>
        </div>
      )}
    </div>
  );
}
