import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import type { Track } from '../store/types';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<any>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const playTrack = useStore((s) => s.playTrack);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const local = useStore.getState().library.playlists.find((p) => p.id === id);

        if (local) {
          setPlaylist({ ...local, title: local.name });
          setTracks(local.tracks || []);
        } else {
          const data = await api.getPlaylistTracks(id);
          setPlaylist({ id, title: data?.title || 'плейлист', tracks: data?.tracks || [] });
          setTracks(data?.tracks || []);
        }
      } catch {
        showToast('плейлист не найден', 'error');
        navigate('/library');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, navigate, showToast]);

  const handlePlayAll = () => {
    if (!tracks.length) return;
    playTrack(tracks[0], tracks, 0);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary bg-bg-primary">
        <Icon name="alert-circle" size={64} className="mb-4 text-text-tertiary" />
        <p className="text-lg mb-2">плейлист не найден</p>
        <button
          onClick={() => navigate('/library')}
          className="mt-4 px-6 py-2 bg-bg-secondary text-text-primary rounded-full text-sm font-medium hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
        >
          вернуться в библиотеку
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-bg-primary">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-transparent border border-border-subtle text-text-tertiary px-4 py-2 rounded-full text-sm hover:text-text-primary hover:border-border-visible transition-all duration-200 mb-6"
        >
          <Icon name="chevron-left" size={16} />
          назад
        </button>

        <div className="flex gap-6 mb-8 flex-col sm:flex-row items-center sm:items-start">
          <div className="w-48 h-48 rounded-2xl bg-bg-secondary flex items-center justify-center shadow-2xl shadow-white/5 flex-shrink-0 border border-border-subtle">
            <Icon name="folder" size={80} className="text-text-tertiary opacity-60" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm text-text-tertiary mb-2">плейлист</p>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {playlist.title || 'без названия'}
            </h1>
            <p className="text-text-tertiary mb-4">{tracks.length} треков</p>
            <button
              onClick={handlePlayAll}
              className="px-6 py-2 bg-bg-secondary text-text-primary rounded-full font-medium flex items-center gap-2 hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
            >
              <Icon name="play" size={16} />
              слушать всё
            </button>
          </div>
        </div>

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