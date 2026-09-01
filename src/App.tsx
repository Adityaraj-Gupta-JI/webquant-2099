import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeroVideoModal } from './components/HeroVideoModal';
import { Nav } from './components/Nav';
import { PixelSpiderScene } from './components/PixelSpiderScene';
import { VideoModalProvider } from './components/VideoModalContext';
import { AnalysisProvider } from './hooks/useAnalysis';
import { Analyze } from './pages/Analyze';
import { Landing } from './pages/Landing';
import { Portfolio } from './pages/Portfolio';
import { Risk } from './pages/Risk';
import { TheWeb } from './pages/TheWeb';

export default function App() {
  // A `?auto=` deep link means the viewer asked to land on a finished analysis,
  // so the intro would only be in the way. Every other entry point plays it.
  const [params] = useSearchParams();
  const skipIntro = params.get('auto') !== null;

  return (
    <AnalysisProvider>
      <VideoModalProvider initiallyVisible={!skipIntro}>
        <HeroVideoModal />
        <div className="grain relative min-h-screen">
          <PixelSpiderScene />
          <div className="relative z-10">
            <Nav />
            <ErrorBoundary>
              <main>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/analyze" element={<Analyze />} />
                  <Route path="/web" element={<TheWeb />} />
                  <Route path="/risk" element={<Risk />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </ErrorBoundary>
            <footer className="rule mt-24">
              <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-8 font-mono text-[10px] uppercase tracking-[0.16em] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <span>WEBQUANT 2099 · Research signals, not investment advice</span>
                <span>Deterministic quant core · Multi-agent interpretation</span>
                <span>Built by Chetan Kumar (24BLC1059)</span>
              </div>
            </footer>
          </div>
        </div>
      </VideoModalProvider>
    </AnalysisProvider>
  );
}
