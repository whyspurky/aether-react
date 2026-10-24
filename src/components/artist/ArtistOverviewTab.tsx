import type { ArtistSectionMeta, ArtistTab, Playlist, Track, User } from '@store/types';
import { HorizontalScroll } from '@components/ui/HorizontalScroll';
import { TrackCard } from '@components/track/TrackCard';
import { ArtistSection } from './ArtistSection';
import { ArtistPlaylistCard } from './ArtistPlaylistCard';
// import { ArtistRelatedList } from './ArtistRelatedList';
import { ArtistEmpty, ArtistSectionError } from './ArtistEmpty';
import { ArtistCardsSkeleton } from './ArtistSkeletons';

interface Props {
  sections: Record<string, ArtistSectionMeta>;
  popular: Track[];
  releases: Playlist[];
  playlists: Playlist[];
  related: User[];
  onRetry: (key: 'popular' | 'playlists' | 'related') => void;
  onRelatedMore: () => void;
  onChangeTab: (tab: ArtistTab) => void;
}

const CAROUSEL_WIDTH = 'w-[150px] flex-shrink-0';

export function ArtistOverviewTab({
  sections,
  popular,
  releases,
  playlists,
  // related,
  onRetry,
  // onRelatedMore,
  onChangeTab,
}: Props) {
  const popularMeta = sections.popular;
  const playlistsMeta = sections.playlists;
  // const relatedMeta = sections.related;

  // релизы и плейлисты это один запрос, ошибку рисуем один раз в первом блоке
  const playlistsLoading = playlistsMeta?.status === 'loading' || playlistsMeta?.status === 'idle';
  const playlistsError = playlistsMeta?.status === 'error';
  const showReleases = releases.length > 0 || playlistsLoading || playlistsError;
  const showPlaylists = playlists.length > 0 || (playlistsLoading && releases.length > 0);

  return (
    <div className="space-y-8 pb-8 pt-4">
      <ArtistSection
        title="популярное"
        count={popular.length || undefined}
        actionLabel="все треки"
        onAction={() => onChangeTab('tracks')}
      >
        {popular.length ? (
          <HorizontalScroll gap={16}>
            {popular.slice(0, 10).map((track, index) => (
              <TrackCard key={track.id} track={track} index={index} tracks={popular} />
            ))}
          </HorizontalScroll>
        ) : popularMeta?.status === 'error' ? (
          <ArtistSectionError
            message={popularMeta.error || 'не удалось загрузить треки'}
            onRetry={() => onRetry('popular')}
            compact
          />
        ) : popularMeta?.status === 'ready' ? (
          <ArtistEmpty icon="music" title="у артиста нет треков" compact />
        ) : (
          <ArtistCardsSkeleton count={5} width={160} />
        )}
      </ArtistSection>

      {showReleases && (
        <ArtistSection
          title="релизы"
          count={releases.length}
          actionLabel="все релизы"
          onAction={() => onChangeTab('releases')}
        >
          {releases.length ? (
            <HorizontalScroll gap={16}>
              {releases.slice(0, 10).map((release) => (
                <div key={release.id} className={CAROUSEL_WIDTH}>
                  <ArtistPlaylistCard playlist={release} variant="release" />
                </div>
              ))}
            </HorizontalScroll>
          ) : playlistsError ? (
            <ArtistSectionError
              message={playlistsMeta?.error || 'не удалось загрузить релизы'}
              onRetry={() => onRetry('playlists')}
              compact
            />
          ) : (
            <ArtistCardsSkeleton count={5} />
          )}
        </ArtistSection>
      )}

      {showPlaylists && (
        <ArtistSection
          title="плейлисты"
          count={playlists.length}
          actionLabel="все плейлисты"
          onAction={() => onChangeTab('playlists')}
        >
          {playlists.length ? (
            <HorizontalScroll gap={16}>
              {playlists.slice(0, 10).map((playlist) => (
                <div key={playlist.id} className={CAROUSEL_WIDTH}>
                  <ArtistPlaylistCard playlist={playlist} />
                </div>
              ))}
            </HorizontalScroll>
          ) : (
            <ArtistCardsSkeleton count={5} />
          )}
        </ArtistSection>
      )}

      {/* <ArtistSection title="похожие артисты" count={related.length}>
        <ArtistRelatedList
          artists={related}
          meta={relatedMeta}
          onRetry={() => onRetry('related')}
          onLoadMore={onRelatedMore}
        />
      </ArtistSection> */}
    </div>
  );
}
