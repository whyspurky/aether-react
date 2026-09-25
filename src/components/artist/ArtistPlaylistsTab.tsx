import { ArtistPlaylistCard } from './ArtistPlaylistCard';
import { ArtistEmpty } from './ArtistEmpty';
import type { Playlist } from '@store/types';

interface Props {
  playlists: Playlist[];
}

export function ArtistPlaylistsTab({ playlists }: Props) {
  if (!playlists.length) return <ArtistEmpty text="нет плейлистов" />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {playlists.map((pl) => (
        <ArtistPlaylistCard key={pl.id} playlist={pl} />
      ))}
    </div>
  );
}