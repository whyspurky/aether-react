import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useNavigate } from 'react-router-dom';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import { useTrackAnimation } from '@hooks/player/useTrackAnimation';
import { useProgressDrag } from '@hooks/player/useProgressDrag';
import { PlayerProgressBar } from '@components/player/PlayerProgressBar';
import { PlayerVolumeBar } from '@components/player/PlayerVolumeBar';
import { PlayerQueue } from '@components/player/PlayerQueue';
import { usePositionTick } from '@hooks/player/usePositionTick';

 

export default function PlayerPage() {
  const player = useStore((s) => s.player);
  const queue = useStore((s) => s.queue);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setShuffle = useStore((s) => s.setShuffle);
  const setRepeat = useStore((s) => s.setRepeat);
  const setVolume = useStore((s) => s.setVolume);
  const setPosition = useStore((s) => s.setPosition);
  const navigate = useNavigate();
  const queueScrollRef = useSmoothScroll<HTMLDivElement>();
  const removeFromQueue = useStore((s) => s.removeFromQueue);
  const { currentTrack, isPlaying, volume, shuffle, repeat, position, duration, isLoading, isAudioReady } = player;

 
  const { displayTrack, displayCover, isTrackChanging } = useTrackAnimation(currentTrack);

 
 
  const coverUrl =
    currentTrack?.artwork_url?.replace('-large', '-t500x500') ||
    currentTrack?.user?.avatar_url?.replace('-large', '-t500x500') ||
    null;

  const effectiveDuration = duration > 0
    ? duration
    : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

  const progressDrag = useProgressDrag({
    effectiveDuration,
    position,
    onSeek: setPosition,
  });



  const displayPosition = progressDrag.isDragging ? progressDrag.dragPosition : position;

  const progressPercent = effectiveDuration > 0
    ? (displayPosition / effectiveDuration) * 100
    : 0;

  usePositionTick({
    currentTrackId: currentTrack?.id,
    isLoading,
    isDragging: progressDrag.isDragging,
    setPosition,
    getPendingSeek: () => useStore.getState().player.pendingSeek,
    duration,
    onTrackEnd: () => {
      useStore.getState().nextTrack();
    },
  });

  if (!currentTrack) {
    return (
      <div className="h-full overflow-auto p-6 bg-bg-primary">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-bg-secondary rounded-full blur-xl" />
              <div className="relative w-24 h-24 rounded-full bg-bg-secondary flex items-center justify-center">
                <Icon name="music" size={40} className="text-text-tertiary" />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-text-secondary mb-2">ничего не играет</h2>
            <p className="text-text-tertiary text-sm max-w-sm">добавьте треки из поиска, чтобы начать слушать</p>
          </div>
        </div>
      </div>
    );
  }

  const coverSize = 'calc(50vh - 120px)';

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <div className="flex gap-8" style={{ minHeight: coverSize }}>
          <div
            className="flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-white/5 relative"
            style={{ width: coverSize, height: coverSize }}
          >
            <div
              className={`absolute inset-0 transition-all duration-200 ease-out will-change-transform ${
                isTrackChanging ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
              }`}
            >
              {displayCover ? (
                <img src={displayCover} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                  <Icon name="music" size={64} className="text-text-tertiary" />
                </div>
              )}
            </div>

            <div
              className={`absolute inset-0 transition-all duration-200 ease-out will-change-transform ${
                isTrackChanging ? 'opacity-0 translate-x-12' : 'opacity-100 translate-x-0'
              }`}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={currentTrack.title || 'track'} className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                  <Icon name="music" size={64} className="text-text-tertiary" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col" style={{ height: coverSize }}>
            <div className="overflow-hidden relative">
              <h1
                className={`font-bold text-text-primary mb-2 transition-all duration-200 ease-out will-change-transform ${
                  isTrackChanging ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
                }`}
                style={{ fontSize: 'clamp(1.2rem, 3vw, 2.5rem)', lineHeight: '1.2', wordBreak: 'break-word' }}
              >
                {displayTrack?.title || currentTrack.title || 'без названия'}
              </h1>
            </div>

            <div className="overflow-hidden relative">
              <p
                className={`text-text-secondary transition-all duration-200 ease-out delay-75 will-change-transform ${
                  isTrackChanging ? 'opacity-0 -translate-x-6' : 'opacity-100 translate-x-0'
                }`}
                style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)', wordBreak: 'break-word' }}
              >
                {currentTrack?.user?.id ? (
                  <span
                    onClick={() => navigate(`/artist/${currentTrack.user!.id}`)}
                    className="cursor-pointer hover:text-text-primary transition-colors"
                  >
                    {displayTrack?.user?.username || currentTrack.user.username || ''}
                  </span>
                ) : (
                  displayTrack?.user?.username || currentTrack.user?.username || ''
                )}
              </p>
            </div>

            <div className="flex-1" />

            <PlayerProgressBar
              displayPosition={displayPosition}
              effectiveDuration={effectiveDuration}
              progressPercent={progressPercent}
              isDragging={progressDrag.isDragging}
              onMouseDown={progressDrag.handleMouseDown}
              onTouchStart={progressDrag.handleTouchStart}
            />

            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`p-1.5 rounded-full transition-all ${shuffle ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-secondary'}`}
              >
                <Icon name="shuffle" size={18} />
              </button>
              <button
                onClick={() => prevTrack(true)}
                className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary transition-all"
              >
                <Icon name="skip-back" size={22} />
              </button>
              <button
                onClick={() => { if (!isLoading) togglePlay(); }}
                disabled={isLoading}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isLoading ? 'bg-bg-secondary cursor-wait' : 'bg-bg-secondary hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon name={isPlaying ? 'pause' : 'play'} size={24} className="text-text-primary" />
                )}
              </button>
              <button
                onClick={() => nextTrack(true)}
                className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary transition-all"
              >
                <Icon name="skip-forward" size={22} />
              </button>
              <button
                onClick={() => {
                  const modes = ['none', 'all', 'one'] as const;
                  setRepeat(modes[(modes.indexOf(repeat) + 1) % 3]);
                }}
                className={`p-1.5 rounded-full transition-all ${repeat !== 'none' ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-secondary'}`}
              >
                <Icon name={repeat === 'one' ? 'repeat-1' : 'repeat'} size={18} />
              </button>
            </div>

            <PlayerVolumeBar
              volume={volume}
              isAudioReady={isAudioReady}
              isLoading={isLoading}
              onVolumeChange={setVolume}
            />
          </div>
        </div>

        <PlayerQueue
          tracks={queue.tracks}
          scrollRef={queueScrollRef}
          onRemove={removeFromQueue}
        />
      </div>
    </div>
  );
}