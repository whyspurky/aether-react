import type { Playlist } from '@store/types';

// релиз это альбом или ep, остальное плейлист
export const isRelease = (playlist: Playlist): boolean =>
  playlist.playlist_type === 'album' ||
  playlist.playlist_type === 'ep' ||
  playlist.is_album === true;

const TYPE_LABEL: Record<string, string> = {
  album: 'альбом',
  ep: 'ep',
  single: 'сингл',
  compilation: 'сборник',
  playlist: 'плейлист',
};

export const playlistTypeLabel = (playlist: Playlist): string => {
  const type = playlist.playlist_type || (playlist.is_album ? 'album' : 'playlist');
  return TYPE_LABEL[type] ?? 'плейлист';
};
