import { FileText } from 'lucide-react';
import type { AnalysisResult } from '../types';

/** Source attribution for every retrieval-grounded claim. When retrieval
 *  returned nothing, this panel says so rather than disappearing quietly. */
export function Citations({ result }: { result: AnalysisResult }) {
  const rag = result.rag;
  const fundamental = result.agents.find((a) => a.agentId === 'fundamental');
  const citations = fundamental?.citations ?? [];

  if (!rag || rag.result.status !== 'OK' || citations.length === 0) {
    return (
      <div className="border border-warn/40 bg-warn/[0.04] p-5">
        <p className="label-b text-warn">No source evidence retrieved</p>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ink">
          {rag?.result.note ?? 'Retrieval did not run for this analysis.'}
        </p>
        <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-mute">
          The Fundamental agent therefore makes no document-grounded claim and offers no
          citation. Its signal rests on reported financials alone, and its confidence is
          capped accordingly.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          {citations.length} passages ·{' '}
          {new Set(citations.map((c) => c.documentId)).size} documents ·{' '}
          {rag.result.candidatesConsidered} candidates scanned · {rag.result.latencyMs}ms
        </p>
      </div>
      <p className="mt-2 max-w-[80ch] text-[13px] leading-relaxed text-dim">
        Query: “{rag.question}”
      </p>

      <ul className="mt-5 space-y-px bg-line">
        {citations.map((c, i) => (
          <li key={c.chunkId} className="bg-panel p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[11px] text-signal">[{i + 1}]</span>
              <FileText size={13} className="shrink-0 text-compute" />
              <span className="text-[14px] font-medium text-ink">
                {c.title.replace(/ \(synthetic\)$/, '')}
              </span>
              {c.synthetic && (
                <span className="chip border-warn/40 text-warn">Synthetic corpus</span>
              )}
            </div>
            <p className="label mt-2">
              {c.documentType.replace(/_/g, ' ')} · {c.section} · page {c.page} ·{' '}
              {c.publishedAt} · relevance {c.relevance.toFixed(3)} (cosine{' '}
              {c.similarity.toFixed(3)})
            </p>
            <blockquote className="mt-3 border-l-2 border-line2 pl-4 text-[13px] leading-relaxed text-mute">
              {c.excerpt}
            </blockquote>
            <p className="label mt-3">
              {c.source} · {c.chunkId}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
