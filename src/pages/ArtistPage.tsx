import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import type { User, Track } from '../store/types';

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<User | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const playTrack = useStore((s) => s.playTrack);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const uid = parseInt(id, 10);
        const userTracks = await api.getUserTracks(uid);

        if (!userTracks.length) {
          showToast('у артиста нет треков', 'error');
          navigate('/search');
          return;
        }

        setArtist(userTracks[0].user || null);
        setTracks(userTracks);
      } catch {
        showToast('ошибка загрузки артиста', 'error');
        navigate('/search');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, navigate, showToast]);

  const handlePlayAll = () => {
    if (!tracks.length) return;
    playTrack(tracks[0], tracks, 0);
    navigate('/player');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
        <Icon name="alert-circle" size={64} className="mb-4 text-text-tertiary" />
        <p className="text-lg mb-2">артист не найден</p>
        <button
          onClick={() => navigate('/search')}
          className="mt-4 px-6 py-2 bg-bg-secondary text-text-primary rounded-full text-sm font-medium hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
        >
          вернуться к поиску
        </button>
      </div>
    );
  }

  const coverUrl = artist.avatar_url?.replace('-large', '-t500x500') || null;

  return (
    <div className="h-full overflow-y-auto bg-bg-primary">
      <div className="relative">
        <div className="absolute inset-0 bg-bg-secondary/50 h-64" />
        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={artist.username}
              className="w-32 h-32 rounded-full object-cover border-2 border-border-subtle shadow-xl"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-bg-secondary flex items-center justify-center border-2 border-border-subtle">
              <Icon name="mic" size={48} className="text-text-tertiary" />
            </div>
          )}
          <h1 className="mt-4 text-3xl font-bold text-text-primary">{artist.username}</h1>
          <p className="text-text-tertiary mt-1">
            {artist.followers_count?.toLocaleString() || 0} подписчиков
          </p>
          <button
            onClick={handlePlayAll}
            className="mt-4 px-6 py-2 bg-bg-secondary text-text-primary rounded-full font-medium flex items-center gap-2 hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
          >
            <Icon name="play" size={16} />
            слушать всё
          </button>
        </div>
      </div>

      <div className="px-6 pb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">треки</h2>
        {tracks.length ? (
          <TrackList tracks={tracks} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
            <Icon name="music" size={64} className="mb-4 opacity-30" />
            <p>у этого артиста нет треков</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArtistPage;