import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrackList } from '@components/track/TrackList';
import { Icon } from '@components/ui/Icon';
import { PlaylistHeader } from '@components/playlist/PlaylistHeader';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Playlist, Track } from '@store/types';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useSmoothScroll<HTMLDivElement>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    scrollRef(el);
    rootRef.current = el;
  }, [scrollRef]);

  const cached = useStore((s) => (id ? s.playlistPage.cache[id] : undefined));
  const setPlaylistCache = useStore((s) => s.setPlaylistCache);
  const importPlaylist = useStore((s) => s.importPlaylist);
  const libraryPlaylists = useStore((s) => s.library.playlists);

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

  const handleImport = () => {
    if (!playlist) return;
    const title = playlist.title || playlist.name || 'без названия';
    if (libraryPlaylists.some((p) => p.name === title)) {
      showToast('плейлист уже в библиотеке', 'info');
      return;
    }
    const coverUrl = playlist.artwork_url?.replace('-large', '-t500x500') || undefined;
    importPlaylist(title, tracks, coverUrl);
    showToast('плейлист добавлен в библиотеку', 'success');
  };

  if (isLoading || !playlist) {
    return (
      <div ref={setRefs} className="h-full overflow-y-auto bg-bg-primary">
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

  return (
    <div ref={setRefs} className="h-full overflow-y-auto bg-bg-primary">
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="sticky top-0 z-30 flex items-center gap-2 bg-transparent border border-border-subtle text-text-tertiary px-4 py-2 rounded-full text-sm hover:text-text-primary hover:border-border-visible transition-all duration-200 mb-6"
        >
          <Icon name="chevron-left" size={16} />
          назад
        </button>

        <PlaylistHeader
          playlist={playlist}
          tracks={tracks}
          onPlayAll={() => tracks.length && playTrack(tracks[0], tracks, 0)}
          onImport={handleImport}
        />

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