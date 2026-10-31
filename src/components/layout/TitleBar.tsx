import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { saveNow } from '@lib/store/tauriStorage';

const appWindow = getCurrentWindow();

const btnBase =
  'relative w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary transition-all duration-200 active:scale-90 group/btn';

export function TitleBar() {
  const isPlaying = useStore((s) => s.player.isPlaying);
  const currentTrack = useStore((s) => s.player.currentTrack);

  const handleMinimize = async () => {
    try { await appWindow.minimize(); } catch {}
  };

  const handleMaximize = async () => {
    try { await appWindow.toggleMaximize(); } catch {}
  };

  const handleClose = async () => {
    try { await saveNow(); } catch {}
    try { await appWindow.close(); } catch {}
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-bg-primary/40 backdrop-blur-xl z-30 border-b border-border-subtle"
    >
      {/* левая часть — логотип */}
      <div className="flex items-center gap-2.5 pointer-events-none" data-tauri-drag-region>
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-lg blur-md transition-opacity duration-500 ${
              isPlaying ? 'bg-[var(--accent-primary)] opacity-40' : 'opacity-0'
            }`}
          />
          <div className="relative w-5 h-5 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[var(--accent-primary)]">a</span>
          </div>
        </div>
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          aether
        </span>

        {isPlaying && (
          <div className="flex items-end gap-[2px] h-3 ml-2 animate-content-fade-in">
            <span className="w-[2px] bg-[var(--accent-primary)] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite]" style={{ height: '40%' }} />
            <span className="w-[2px] bg-[var(--accent-primary)] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite_0.15s]" style={{ height: '80%' }} />
            <span className="w-[2px] bg-[var(--accent-primary)] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite_0.3s]" style={{ height: '60%' }} />
            <span className="w-[2px] bg-[var(--accent-primary)] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite_0.45s]" style={{ height: '30%' }} />
          </div>
        )}
      </div>

      {/* центр — название трека */}
      {currentTrack && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none max-w-[40%] animate-content-fade-in"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-primary truncate font-medium">
              {currentTrack.title || 'без названия'}
            </span>
            {currentTrack.user?.username && (
              <>
                <span className="text-text-tertiary">·</span>
                <span className="text-text-tertiary truncate">
                  {currentTrack.user.username}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* правая часть — кнопки управления окном */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          className={`${btnBase} hover:bg-white/[0.06] hover:text-text-primary`}
          aria-label="свернуть"
        >
          <Icon name="minus" size={14} />
        </button>

        <button
          onClick={handleMaximize}
          className={`${btnBase} hover:bg-white/[0.06] hover:text-text-primary`}
          aria-label="развернуть"
        >
          <Icon name="square" size={12} />
        </button>

        <button
          onClick={handleClose}
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary transition-all duration-200 active:scale-90 hover:bg-red-500 hover:text-white group/close"
          aria-label="закрыть"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}