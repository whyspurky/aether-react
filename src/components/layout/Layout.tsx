import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from '../player/PlayerBar';
import { useStore } from '@store/store';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const mainRef = useSmoothScroll<HTMLElement>();
  const location = useLocation();
  const currentTrack = useStore((s) => s.player.currentTrack);

  const isPlayerPage = location.pathname === '/player';
  const hasTrack = !!currentTrack;
  const shouldShow = !isPlayerPage && hasTrack;

  const [playerBarMounted, setPlayerBarMounted] = useState(shouldShow);
  const [playerBarExiting, setPlayerBarExiting] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      setPlayerBarMounted(true);
      setPlayerBarExiting(false);
      return;
    }

    if (!playerBarMounted) return;

    setPlayerBarExiting(true);
    const t = setTimeout(() => {
      setPlayerBarMounted(false);
      setPlayerBarExiting(false);
    }, 150);
    return () => clearTimeout(t);
  }, [shouldShow, playerBarMounted]);
  const blur = useStore((s) => s.blur);
  const playerCoverUrl =
    currentTrack?.artwork_url
      ? currentTrack.artwork_url.replace('-large', '-t500x500')
      : currentTrack?.user?.avatar_url?.replace('-large', '-t500x500') || null;

  const gradientDirections: Record<string, string> = {
    'to-r': 'to right',
    'to-br': 'to bottom right',
    'to-b': 'to bottom',
    'to-bl': 'to bottom left',
    'to-l': 'to left',
    'to-tl': 'to top left',
    'to-t': 'to top',
    'to-tr': 'to top right',
  };

 

  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(playerCoverUrl);
  const preloadRef = useRef<HTMLImageElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentUrl === playerCoverUrl) return;

    if (!playerCoverUrl) return;

    if (!preloadRef.current) {
      preloadRef.current = new Image();
    }
    preloadRef.current.crossOrigin = 'anonymous';
    preloadRef.current.src = playerCoverUrl;

    setPrevUrl(currentUrl);
    setCurrentUrl(playerCoverUrl);

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setPrevUrl(null);
      timeoutRef.current = null;
    }, 800);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [playerCoverUrl]);

  return (
    <div className="h-full flex flex-col pt-10 bg-bg-primary p-2 relative">
      {/* блюр обложки — отдельный слой */}
      {blur.enabled && (
        <>
          {prevUrl && (
            <div
              key={`prev-${prevUrl}`}
              className="absolute inset-2 rounded-2xl pointer-events-none overflow-hidden animate-fade-out-blur"
              style={{
                backgroundImage: `url(${prevUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: `blur(${blur.amount}px) saturate(1.4)`,
                transform: 'scale(1.02)',
                transition: 'filter 200ms ease-out',
                ['--blur-opacity' as string]: String(blur.opacity)
              }}
            />
          )}

          {currentUrl && (
            <div
              key={`curr-${currentUrl}`}
              className="absolute inset-2 rounded-2xl pointer-events-none overflow-hidden animate-fade-in-blur"
              style={{
                backgroundImage: `url(${currentUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: `blur(${blur.amount}px) saturate(1.4)`,
                transform: 'scale(1.02)',
                transition: 'filter 200ms ease-out',
                ['--blur-opacity' as string]: String(blur.opacity)
              }}
            />
          )}
        </>
      )}

      <div className="relative flex flex-1 min-h-0 gap-2">
        <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-border-subtle bg-bg-secondary/50">
          <Sidebar currentPath={location.pathname} onNavigate={navigate} />
        </div>

        <div className="flex-1 min-w-0 relative noise-overlay">
          <div className="absolute inset-0 rounded-2xl border border-border-subtle bg-bg-secondary/30 overflow-hidden">
            <main
              ref={mainRef}
              key={location.pathname}
              className={`absolute inset-0 p-4 animate-page-in scrollbar-hidden ${
                isPlayerPage
                  ? 'overflow-hidden pb-0'
                  : `overflow-auto ${playerBarMounted ? 'pb-[65px]' : 'pb-4'}`
              }`}
            >
              {children}
            </main>

            {playerBarMounted && (
              <div
                className={`absolute bottom-0 left-0 right-0 z-20 border-t border-border-subtle bg-bg-primary/70 backdrop-blur-xl ${
                  playerBarExiting ? 'playerbar-exit' : 'playerbar-enter'
                }`}
              >
                <PlayerBar />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}