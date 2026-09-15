import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';

interface BrokenTrack {
  id: number;
  title: string;
  artist: string;
  errorMessage: string;
  timestamp: number;
}

interface BrokenTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (ts: number) => {
  const d = new Date(ts);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()} ${hh}:${mi}`;
};

export function BrokenTracksModal({ isOpen, onClose }: BrokenTracksModalProps) {
  const [brokenTracks, setBrokenTracks] = useState<BrokenTrack[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);

    const stored = localStorage.getItem('aether_broken_tracks');
    if (stored) {
      try {
        setBrokenTracks(JSON.parse(stored));
      } catch {
        setBrokenTracks([]);
      }
    } else {
      setBrokenTracks([]);
    }

    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  const handleClear = () => {
    localStorage.removeItem('aether_broken_tracks');
    setBrokenTracks([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-bg-primary/60 backdrop-blur-sm flex items-center justify-center z-[2200] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-card rounded-xl w-[90%] max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-border-subtle animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h3 className="text-base font-medium text-text-primary">битые треки</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {brokenTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
              <Icon name="check-circle" size={32} className="mb-3 opacity-30" />
              <p className="text-sm">лог пуст</p>
            </div>
          ) : (
            <div className="space-y-2">
              {brokenTracks.map((t) => (
                <div
                  key={`${t.id}-${t.timestamp}`}
                  className="p-3 rounded-lg bg-bg-secondary border border-border-subtle"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{t.artist}</p>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {formatDate(t.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-2">{t.errorMessage}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-4 border-t border-border-subtle">
          <span className="text-xs text-text-tertiary">
            всего: {brokenTracks.length}
          </span>
          <div className="flex gap-3">
            {brokenTracks.length > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg text-xs text-text-tertiary hover:bg-bg-secondary transition-colors"
              >
                очистить лог
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs bg-bg-secondary text-text-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
            >
              закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}