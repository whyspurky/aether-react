import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import { useSmoothScroll } from '../hooks/useSmoothScroll';
import type { Playlist, Track } from '../store/types';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useSmoothScroll<HTMLDivElement>();

  const cached = useStore((s) => (id ? s.playlistPage.cache[id] : undefined));
  const setPlaylistCache = useStore((s) => s.setPlaylistCache);

  const [playlist, setPlaylist] = useState<Playlist | null>(cached?.playlist ?? null);
  const [tracks, setTracks] = useState<Track[]>(cached?.tracks ?? []);
  const [isLoading, setIsLoading] = useState(!cached);

  const playTrack = useStore((s) => s.playTrack);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const local = useStore.getState().library.playlists.find((p) => p.id === id);
        if (local) {
          setPlaylist(local);
          setTracks(local.tracks || []);
          setPlaylistCache(id, { playlist: local, tracks: local.tracks || [], scrollTop: cached?.scrollTop ?? 0 });
          setIsLoading(false);
          return;
        }

const [data, allTracks] = await Promise.all([
  api.getPlaylist(id),
  api.getPlaylistTracks(id),
]);

if (!data) {
  showToast('плейлист не найден', 'error');
  navigate('/library');
  return;
}

setPlaylist(data);
setTracks(allTracks);
setPlaylistCache(id, { playlist: data, tracks: allTracks, scrollTop: cached?.scrollTop ?? 0 });
      } catch {
        showToast('ошибка загрузки плейлиста', 'error');
        navigate('/library');
      } finally {
        setIsLoading(false);
      }
    };

    if (!cached) load();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, showToast]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    scrollRef(el);
    rootRef.current = el;
  }, [scrollRef]);

  useEffect(() => {
    if (!isLoading && cached?.scrollTop && rootRef.current) {
      requestAnimationFrame(() => {
        if (rootRef.current) rootRef.current.scrollTop = cached.scrollTop;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    return () => {
      const el = rootRef.current;
      if (id && el) setPlaylistCache(id, { scrollTop: el.scrollTop });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading || !playlist) {
    return (
      <div
        ref={setRefs}
        className="h-full overflow-y-auto bg-bg-primary"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <Icon name="alert-circle" size={64} className="mb-4 text-text-tertiary" />
            <p className="text-lg mb-2">плейлист не найден</p>
            <button
              onClick={() => navigate('/library')}
              className="mt-4 px-6 py-2 bg-bg-secondary text-text-primary rounded-full text-sm font-medium hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
            >
              вернуться в библиотеку
            </button>
          </div>
        )}
      </div>
    );
  }

  const coverUrl = playlist.artwork_url?.replace('-large', '-t500x500') || null;
  const title = playlist.title || playlist.name || 'без названия';

  const typeLabel = {
    album: 'альбом',
    ep: 'ep',
    playlist: 'плейлист',
  }[playlist.playlist_type || 'playlist'];

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
  };

  return (
    <div
      ref={setRefs}
      className="h-full overflow-y-auto bg-bg-primary"
    >
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-transparent border border-border-subtle text-text-tertiary px-4 py-2 rounded-full text-sm hover:text-text-primary hover:border-border-visible transition-all duration-200 mb-6"
        >
          <Icon name="chevron-left" size={16} />
          назад
        </button>

        {/* шапка */}
        <div className="flex gap-6 mb-8 items-start">
          {/* обложка слева */}
          <div className="flex-shrink-0">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={title}
                className="w-48 h-48 rounded-2xl object-cover border border-border-subtle shadow-2xl shadow-white/5"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl bg-bg-secondary flex items-center justify-center border border-border-subtle">
                <Icon name="folder" size={64} className="text-text-tertiary opacity-60" />
              </div>
            )}
          </div>

          {/* инфа справа */}
          <div className="flex-1 min-w-0 pt-2">
            <p className="text-xs text-text-tertiary uppercase tracking-wider">{typeLabel}</p>

            <h1 className="text-4xl font-bold text-text-primary mt-2 break-words">{title}</h1>

            {playlist.user && (
              <button
                onClick={() => navigate(`/artist/${playlist.user!.id}`)}
                className="flex items-center gap-2 mt-3 text-text-secondary hover:text-text-primary transition-colors"
              >
                {playlist.user.avatar_url && (
                  <img
                    src={playlist.user.avatar_url.replace('-large', '-t100x100')}
                    alt={playlist.user.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium">{playlist.user.username}</span>
              </button>
            )}

            {playlist.description && (
              <p className="text-text-tertiary text-sm mt-3 line-clamp-3 leading-relaxed">
                {playlist.description}
              </p>
            )}

            {/* мета: количество треков + длительность */}
            <div className="flex items-center gap-4 mt-5 text-sm text-text-tertiary">
              <span>{tracks.length} треков</span>
              {playlist.duration && (
                <>
                  <span>·</span>
                  <span>{formatDuration(playlist.duration)}</span>
                </>
              )}
            </div>

            <button
              onClick={() => tracks.length && playTrack(tracks[0], tracks, 0)}
              disabled={!tracks.length}
              className="mt-5 px-6 py-2 bg-bg-secondary text-text-primary rounded-full font-medium flex items-center gap-2 hover:bg-text-secondary hover:text-bg-primary transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-secondary disabled:hover:text-text-primary"
            >
              <Icon name="play" size={16} />
              слушать всё
            </button>
          </div>
        </div>

        {/* треки */}
        {tracks.length ? (
          <TrackList tracks={tracks} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
            <Icon name="music" size={64} className="mb-4 opacity-30" />
            <p>плейлист пуст</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaylistPage;