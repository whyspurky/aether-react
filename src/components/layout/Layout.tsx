import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from '../player/PlayerBar';
import { CoverBackground } from './CoverBackground';
import { useStore } from '@store/store';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTrack = useStore((s) => s.player.currentTrack);
  const noiseOn = useStore((s) => s.perf.noise);

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

  return (
    <div
      className={`h-full flex flex-col pt-12 bg-bg-primary p-2 relative ${
        noiseOn ? 'noise-overlay' : ''
      }`}
    >
      <CoverBackground />

      <div className="relative z-10 flex flex-1 min-h-0 gap-2">
        <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-border-subtle bg-bg-secondary/50">
          <Sidebar currentPath={location.pathname} onNavigate={navigate} />
        </div>

        <div className="flex-1 min-w-0 relative">
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
