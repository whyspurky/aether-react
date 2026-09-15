import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';
import { useStore } from '../store/store';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTrack = useStore((s) => s.player.currentTrack);

  const isPlayerPage = location.pathname === '/player';
  const hasTrack = !!currentTrack;

  return (
    <div className="h-full flex flex-col pt-10 bg-bg-primary p-2">
      <div className="flex flex-1 min-h-0 gap-2">
        <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-border-subtle bg-bg-secondary/50">
          <Sidebar currentPath={location.pathname} onNavigate={navigate} />
        </div>

        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden border border-border-subtle bg-bg-secondary/30 flex flex-col">
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>

          {!isPlayerPage && hasTrack && (
            <div className="flex-shrink-0 border-t border-border-subtle">
              <PlayerBar />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}