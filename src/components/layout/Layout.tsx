import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from '../player/PlayerBar';
import { useStore } from '@store/store';

interface LayoutProps {
  children: ReactNode;
}

function buildCoverCandidates(url: string, blurAmount: number): string[] {
  const base = url.replace(/-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)(\.[a-z]+)?$/, '');
  const ext = url.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
  const big = `${base}-t500x500${ext}`;
  const small = `${base}-t300x300${ext}`;

  // при сильном размытии деталей не остаётся, хватает маленькой картинки
  return blurAmount >= 24 ? [small, big, url] : [big, small, url];
}

// размываем уменьшенный слой и растягиваем: пятна те же, растр в 16 раз меньше
function BlurredCover({ url, className }: { url: string; className?: string }) {
  const blur = useStore((s) => s.blur);
  const scale = 4;
  const radius = Math.max(0, blur.amount) / scale;

  return (
    <div
      className={`absolute inset-2 rounded-2xl pointer-events-none overflow-hidden ${className || ''}`}
      style={{ ['--blur-opacity' as string]: String(blur.opacity) }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${radius}px) saturate(1.4)`,
        }}
      />
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTrack = useStore((s) => s.player.currentTrack);
  const blur = useStore((s) => s.blur);
  const noiseOn = useStore((s) => s.perf.noise);
  const bgCoverOn = useStore((s) => s.perf.bgCover);

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

  const rawCover =
    bgCoverOn && blur.enabled ? currentTrack?.artwork_url || currentTrack?.user?.avatar_url || null : null;
  const candidates = rawCover ? buildCoverCandidates(rawCover, blur.amount) : [];

  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(candidates[0] || null);
  const preloadRef = useRef<HTMLImageElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!candidates.length) return;
    if (currentUrl === candidates[0]) return;

    let cancelled = false;

    const tryLoad = (index: number) => {
      if (cancelled || index >= candidates.length) return;

      const img = new Image();
      preloadRef.current = img;

      img.onload = () => {
        if (cancelled) return;
        setPrevUrl(currentUrl);
        setCurrentUrl(candidates[index]);
      };
      img.onerror = () => {
        if (cancelled) return;
        tryLoad(index + 1);
      };
      img.src = candidates[index];
    };

    tryLoad(0);

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setPrevUrl(null);
      timeoutRef.current = null;
    }, 800);

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [candidates[0]]);

  return (
    <div className="h-full flex flex-col pt-10 bg-bg-primary p-2 relative">
      {blur.enabled && bgCoverOn && (
        <>
          {prevUrl && (
            <BlurredCover key={`prev-${prevUrl}`} url={prevUrl} className="animate-fade-out-blur" />
          )}

          {currentUrl && (
            <BlurredCover key={`curr-${currentUrl}`} url={currentUrl} className="animate-fade-in-blur" />
          )}
        </>
      )}

      <div className="relative flex flex-1 min-h-0 gap-2">
        <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-border-subtle bg-bg-secondary/50">
          <Sidebar currentPath={location.pathname} onNavigate={navigate} />
        </div>

        <div className={`flex-1 min-w-0 relative ${noiseOn ? 'noise-overlay' : ''}`}>
          <div className="absolute inset-0 rounded-2xl border border-border-subtle bg-bg-secondary/30 overflow-hidden">
            <main
              key={location.pathname}
              className={`absolute inset-0 p-4 animate-page-in scrollbar-hidden flex flex-col ${
                isPlayerPage
                  ? 'overflow-hidden pb-0'
                  : `overflow-hidden ${playerBarMounted ? 'pb-[65px]' : 'pb-4'}`
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