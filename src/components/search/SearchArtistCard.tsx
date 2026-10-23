import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import type { User } from '@store/types';

interface Props {
  artist: User;
}

export function SearchArtistCard({ artist }: Props) {
  const navigate = useNavigate();
  const open = () => navigate(`/artist/${artist.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="flex items-center gap-3 p-3 rounded-xl bg-bg-card/60 backdrop-blur-sm border border-border-subtle hover:border-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] hover:bg-[var(--accent-muted)] transition-all duration-200 cursor-pointer group outline-none focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:bg-[var(--accent-muted)]"
    >
      {artist.avatar_url ? (
        <img
          src={artist.avatar_url}
          alt=""
          className="w-10 h-10 rounded-full object-cover ring-0 ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] group-hover:ring-2 transition-all duration-200"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center">
          <Icon name="mic" size={16} className="text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate transition-colors group-hover:text-[var(--accent-primary)]">
          {artist.username}
        </h4>
        <p className="text-xs text-text-tertiary">
          {artist.followers_count?.toLocaleString() || 0} слушателей
        </p>
      </div>

      <Icon
        name="chevron-right"
        size={16}
        className="text-text-tertiary group-hover:text-text-secondary transition-all duration-200 group-hover:translate-x-0.5"
      />
    </div>
  );
}
