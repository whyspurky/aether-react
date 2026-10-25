import { useMemo } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';

function getTimeOfDay(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'доброе утро', icon: 'sun' };
  if (hour >= 12 && hour < 18) return { text: 'добрый день', icon: 'sun' };
  if (hour >= 18 && hour < 23) return { text: 'добрый вечер', icon: 'moon' };
  return { text: 'доброй ночи', icon: 'moon' };
}

export function HomeGreeting() {
  const history = useStore((s) => s.library.history);
  const playTrack = useStore((s) => s.playTrack);

  const { text, icon } = useMemo(() => getTimeOfDay(), []);

  const randomTrack = useMemo(() => {
    if (history.length === 0) return null;
    return history[Math.floor(Math.random() * Math.min(history.length, 20))];
  }, [history]);

  const handleRandom = () => {
    if (!randomTrack) return;
    const idx = history.findIndex((t) => t.id === randomTrack.id);
    playTrack(randomTrack, history, Math.max(0, idx), 'главная');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--accent-muted)] blur-3xl pointer-events-none" />

      <div className="relative p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center">
            <Icon name={icon} size={22} className="text-[var(--accent-primary)]" filled/>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text-primary truncate">
              {text}
            </h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              {history.length > 0
                ? 'что послушаем сегодня?'
                : 'начни с поиска треков'}
            </p>
          </div>
        </div>

        {randomTrack && (
          <button
            onClick={handleRandom}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] text-text-primary hover:bg-[var(--accent-muted)] hover:text-[var(--accent-primary)] transition-all duration-200 active:scale-[0.97] group"
          >
            <Icon name="shuffle" size={16} className="transition-transform duration-200 group-hover:rotate-180" />
            <span className="text-sm font-medium">случайный</span>
          </button>
        )}
      </div>
    </div>
  );
}