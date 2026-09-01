import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BootSequence } from './BootSequence';
import { useVideoModal } from './VideoModalContext';

/** Intro overlay. Plays `public/spider_2099_glitch.mp4` when that asset exists,
 *  and falls back to an original animated boot sequence when it does not — the
 *  overlay is never empty and never shows a broken player.
 *  Built by Chetan Kumar (24BLC1059). */

const VIDEO_SRC = '/spider_2099_glitch.mp4';

type VideoState = 'probing' | 'ready' | 'unavailable';

export function HeroVideoModal() {
  const { isModalVisible, closeModal } = useVideoModal();
  const [video, setVideo] = useState<VideoState>('probing');
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTo = useRef<Element | null>(null);

  // Escape closes; focus moves to the close button and is restored on exit.
  useEffect(() => {
    if (!isModalVisible) return;
    restoreFocusTo.current = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      // Only one focusable element inside, so Tab simply stays put.
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      (restoreFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [isModalVisible, closeModal]);

  const onVideoError = useCallback(() => setVideo('unavailable'), []);
  const onVideoReady = useCallback(() => setVideo('ready'), []);

  if (!isModalVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.9)' }}
      role="dialog"
      aria-modal="true"
      aria-label="WEBQUANT 2099 intro"
      onClick={closeModal}
    >
      <button
        ref={closeRef}
        onClick={closeModal}
        aria-label="Close intro"
        /* Padding gives a 44px target — the web equivalent of hitSlop. */
        className="absolute right-5 top-9 z-10 border border-line2 bg-panel p-3 text-mute transition-colors hover:border-signal hover:text-signal"
      >
        <X size={18} strokeWidth={2} />
      </button>

      <div
        className="relative flex max-h-[88vh] w-full max-w-5xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The video mounts while probing so it can report canplay or error.
            It stays hidden until it is genuinely playable. */}
        {video !== 'unavailable' && (
          <video
            className={`max-h-[76vh] w-full border border-line bg-void object-contain ${
              video === 'ready' ? 'block' : 'hidden'
            }`}
            src={VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={onVideoReady}
            onError={onVideoError}
          />
        )}

        {video !== 'ready' && <BootSequence />}

        <p className="absolute -bottom-8 left-0 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
          {video === 'ready' ? 'Intro sequence' : 'Demo intro · no video asset loaded'} · Built by
          Chetan Kumar (24BLC1059)
        </p>
      </div>
    </div>
  );
}
