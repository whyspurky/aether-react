import { useStore } from '@store/store';
import { useAddToPlaylist } from '@components/playlist/AddToPlaylistProvider';
import { useContextMenu } from '@components/ui/ContextMenuProvider';
import type { Track } from '@store/types';

export function useTrackContextMenu() {
  const contextMenu = useContextMenu();
  const { open: openAddToPlaylist } = useAddToPlaylist();

  const openTrackMenu = (
    track: Track,
    e: React.MouseEvent<HTMLElement>,
    options?: { onRemove?: (track: Track) => void; below?: boolean }
  ) => {
    const anchor = e.currentTarget;
    const rect = anchor.getBoundingClientRect();

    const x = options?.below ? rect.left : e.clientX;
    const y = options?.below ? rect.bottom + 4 : e.clientY;

    contextMenu.open(
      x,
      y,
      [
        {
          label: 'добавить в очередь',
          icon: 'plus',
          onClick: () => useStore.getState().addToQueue(track),
        },
        {
          label: 'добавить в плейлист',
          icon: 'folder',
          onClick: () => openAddToPlaylist(track, anchor),
        },
        ...(options?.onRemove
          ? [
              {
                label: 'удалить',
                icon: 'trash-2',
                danger: true,
                onClick: () => options.onRemove!(track),
              },
            ]
          : []),
      ],
      anchor
    );
  };

  return { openTrackMenu };
}