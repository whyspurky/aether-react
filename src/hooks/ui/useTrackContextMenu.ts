import { useStore } from '@store/store';
import { api } from '@lib/api';
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
    const state = useStore.getState();
    const cached = state.offline.entries[track.id];

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
          // позиционируем по точке, где открылось меню, а не по краю строки
          onClick: () => openAddToPlaylist(track, { x, y }),
        },
        ...(cached?.offline
          ? [
              {
                label: 'удалить из офлайн',
                icon: 'trash-2',
                danger: true,
                onClick: () => {
                  void api
                    .trackRemoveCached(track.id, true)
                    .then(() => {
                      useStore.getState().removeCacheEntry(track.id);
                      useStore.getState().refreshCacheSizes();
                    })
                    .catch(() => {});
                },
              },
            ]
          : [
              {
                label: 'сохранить офлайн',
                icon: 'download-cloud',
                onClick: () => {
                  void api
                    .trackEnsureCached(track.id, {
                      quality: useStore.getState().offline.quality,
                      durationMs: track.duration,
                      offline: true,
                    })
                    .then((result) => {
                      useStore.getState().setCacheEntry(result.entry);
                      useStore.getState().refreshCacheSizes();
                    })
                    .catch(() => {});
                },
              },
              ...(cached
                ? [
                    {
                      label: 'удалить из кэша',
                      icon: 'trash-2',
                      danger: true,
                      onClick: () => {
                        void api
                          .trackRemoveCached(track.id, false)
                          .then(() => {
                            useStore.getState().removeCacheEntry(track.id);
                            useStore.getState().refreshCacheSizes();
                          })
                          .catch(() => {});
                      },
                    },
                  ]
                : []),
            ]),
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