import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Isolated visibility state for the intro overlay.
 *  Deliberately its own context: no existing screen has to thread props, so
 *  nothing in the analysis, agent or graph layers is touched by this feature.
 *  Built by Chetan Kumar (24BLC1059). */

interface VideoModalContextValue {
  isModalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const VideoModalContext = createContext<VideoModalContextValue | null>(null);

export function VideoModalProvider({
  children,
  /** Plays on load by default; suppressed for `?auto=` demo deep links, which
   *  exist precisely to jump straight to a finished state. */
  initiallyVisible = true,
}: {
  children: ReactNode;
  initiallyVisible?: boolean;
}) {
  const [isModalVisible, setVisible] = useState(initiallyVisible);

  const openModal = useCallback(() => setVisible(true), []);
  const closeModal = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ isModalVisible, openModal, closeModal }),
    [isModalVisible, openModal, closeModal],
  );

  return <VideoModalContext.Provider value={value}>{children}</VideoModalContext.Provider>;
}

export function useVideoModal(): VideoModalContextValue {
  const ctx = useContext(VideoModalContext);
  if (!ctx) throw new Error('useVideoModal must be used inside <VideoModalProvider>');
  return ctx;
}
