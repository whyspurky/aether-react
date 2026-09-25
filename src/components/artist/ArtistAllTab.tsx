import { TrackList } from '../track/TrackList';
import { TrackCard } from '../track/TrackCard';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import { Icon } from '@components/ui/Icon';
import { ScrollableSection } from './ScrollableSection';
import { ArtistCard } from './ArtistCard';
import type { User, Track} from '@store/types';

interface Props {
  popularTracks: Track[];
  tracks: Track[];
  reposts: Track[];
  relatedArtists: User[];
  visibleTracks: number;
  visibleReposts: number;
  onShowMoreTracks: () => void;
  onShowMoreReposts: () => void;
}

export function ArtistAllTab({
  popularTracks,
  tracks,
  reposts,
  relatedArtists,
  visibleTracks,
  visibleReposts,
  onShowMoreTracks,
  onShowMoreReposts,
}: Props) {
  return (
    <div className="space-y-8">
      {popularTracks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-4">популярные</h2>
          <HorizontalScroll gap={20}>
            {popularTracks.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} tracks={popularTracks} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {(tracks.length > 0 || reposts.length > 0) && (
        <div className={`grid gap-6 ${tracks.length > 0 && reposts.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {tracks.length > 0 && (
            <ScrollableSection title="треки" count={tracks.length}>
              <TrackList tracks={tracks.slice(0, visibleTracks)} showNumber={false} />
              {visibleTracks < tracks.length && (
                <button
                  onClick={onShowMoreTracks}
                  className="w-full mt-2 py-2 rounded-lg text-xs text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
                >
                  показать ещё {Math.min(100, tracks.length - visibleTracks)}
                </button>
              )}
            </ScrollableSection>
          )}

          {reposts.length > 0 && (
            <ScrollableSection title="репосты" count={reposts.length}>
              <TrackList tracks={reposts.slice(0, visibleReposts)} showNumber={false} />
              {visibleReposts < reposts.length && (
                <button
                  onClick={onShowMoreReposts}
                  className="w-full mt-2 py-2 rounded-lg text-xs text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
                >
                  показать ещё {Math.min(100, reposts.length - visibleReposts)}
                </button>
              )}
            </ScrollableSection>
          )}
        </div>
      )}

      {relatedArtists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-4">похожие</h2>
          <HorizontalScroll gap={16}>
            {relatedArtists.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {!popularTracks.length && !tracks.length && !reposts.length && (
        <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
          <Icon name="music" size={64} className="mb-4 opacity-30" />
          <p>у этого артиста пока ничего нет</p>
        </div>
      )}
    </div>
  );
}