import { RefObject } from 'react';
import { Icon } from '@components/ui/Icon';
import { TrackCard } from '../track/TrackCard';
import { HorizontalScroll } from '../ui/HorizontalScroll';
import type { Track } from '@store/types';

interface Props {
  tracks: Track[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  scrollRef: RefObject<HTMLDivElement>;
}

const TITLE_WIDTHS = ['w-3/4', 'w-2/3', 'w-5/6', 'w-1/2', 'w-4/5', 'w-3/5', 'w-11/12'];
const ARTIST_WIDTHS = ['w-1/2', 'w-1/3', 'w-2/5', 'w-1/4', 'w-1/2', 'w-1/3', 'w-3/4'];

export function PopularSection({
  tracks,
  isLoading,
  isLoadingMore,
  hasMore,
  scrollRef,
}: Props) {
  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-2xl border border-border-subtle bg-bg-secondary/50 backdrop-blur-sm p-4 h-72 transition-all duration-200 hover:border-border-visible">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="flame" size={16} className="text-text-tertiary" />
            <h2 className="text-sm font-bold text-text-primary">популярное</h2>
          </div>
          {isLoadingMore && (
            <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {isLoading ? (
          <HorizontalScroll gap={12} style={{ minHeight: '280px' }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-[160px] flex-shrink-0 animate-pulse">
                <div className="aspect-square rounded-xl bg-bg-secondary" />
                <div className={`mt-2 h-3 bg-bg-secondary rounded ${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}`} />
                <div className={`mt-1 h-2 bg-bg-secondary rounded ${ARTIST_WIDTHS[i % ARTIST_WIDTHS.length]}`} />
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <HorizontalScroll
            ref={scrollRef}
            gap={12}
            style={{ minHeight: '280px' }}
            className="animate-content-fade-in"
          >
            {tracks.map((track, i) => (
              <div key={`${track.id}-${i}`}>
                <TrackCard track={track} index={i} tracks={tracks} />
              </div>
            ))}
            {isLoadingMore && (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-[160px] flex-shrink-0 animate-pulse">
                    <div className="aspect-square rounded-xl bg-bg-secondary" />
                    <div className="mt-2 h-3 bg-bg-secondary rounded w-3/4" />
                    <div className="mt-1 h-2 bg-bg-secondary rounded w-1/2" />
                  </div>
                ))}
              </>
            )}
          </HorizontalScroll>
        )}

        {!hasMore && tracks.length > 0 && !isLoading && (
          <div className="text-center text-text-tertiary text-xs mt-2 animate-fade-in">
            это всё популярное
          </div>
        )}
      </div>
    </div>
  );
}