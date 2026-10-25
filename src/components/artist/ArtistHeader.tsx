import { useMemo, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Icon } from '@components/ui/Icon';
import { formatCount, formatYear, splitDescriptionLinks, upgradeCoverUrl } from '@lib/format';
import type { User } from '@store/types';

interface Props {
  artist: User;
  plays: number;
  playlistsCount: number;
  onPlay: () => void;
  onShuffle: () => void;
  canPlay: boolean;
}

export function ArtistHeader({
  artist,
  onPlay,
  onShuffle,
  canPlay,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const avatarUrl = upgradeCoverUrl(artist.avatar_url, 't500x500');
  const location = [artist.city, artist.country_code].filter(Boolean).join(', ');
  const joined = formatYear(artist.created_at);

  const description = artist.description?.trim() ?? '';
  const isLong = description.length > 180;
  const pieces = useMemo(
    () => (description ? splitDescriptionLinks(description) : []),
    [description]
  );

  const stats = [
    `${formatCount(artist.followers_count)} подписчиков`,
  ].filter(Boolean) as string[];

  const handleCopyLink = async () => {
    if (!artist.permalink_url) return;
    try {
      await navigator.clipboard.writeText(artist.permalink_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // буфер обмена может быть недоступен, молча пропускаем
    }
  };

  return (
    <div className="px-6 pb-4 pt-1">
      <div className="flex gap-6 items-start">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ viewTransitionName: 'artist-avatar' }}
              className="w-36 lg:w-48 aspect-square rounded-full object-cover shadow-2xl shadow-black/40"
            />
          ) : (
            <div
              style={{ viewTransitionName: 'artist-avatar' }}
              className="w-36 lg:w-48 aspect-square rounded-full bg-white/[0.06] flex items-center justify-center"
            >
              <Icon name="mic" size={56} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1
              style={{ viewTransitionName: 'artist-name' }}
              className="text-4xl font-bold text-text-primary truncate"
            >
              {artist.username}
            </h1>
            {artist.verified && (
              <span role="img" aria-label="подтверждённый артист" className="flex-shrink-0 flex">
                <Icon name="check-circle" size={20}  />
              </span>
            )}
          </div>

          {artist.full_name && artist.full_name !== artist.username && (
            <p className="text-text-secondary text-base mt-0.5 truncate">{artist.full_name}</p>
          )}

          <p className="text-sm text-text-tertiary mt-2 truncate">{stats.join(' · ')}</p>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-text-tertiary">
            {location && (
              <span className="flex items-center gap-1">
                <Icon name="map-pin" size={12} />
                {location}
              </span>
            )}
            {joined && (
              <span className="flex items-center gap-1">
                <Icon name="clock" size={12} />
                с {joined}
              </span>
            )}
            {artist.permalink_url && (
              <button
                type="button"
                onClick={() => openUrl(artist.permalink_url!)}
                className="flex items-center gap-1 hover:text-text-secondary transition-colors"
                aria-label="открыть профиль в soundcloud"
              >
                <Icon name="soundcloud" size={12} />
                soundcloud
                <Icon name="arrow-up-right" size={10} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={onPlay}
              disabled={!canPlay}
              className="px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity duration-200 disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]"
            >
              <Icon name="play" size={16} filled/>
              слушать все
            </button>

            <button
              type="button"
              onClick={onShuffle}
              disabled={!canPlay}
              className="w-9 h-9 rounded-full grid place-items-center border border-white/[0.1] bg-white/[0.04] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
              aria-label="перемешать треки"
            >
              <Icon name="shuffle" size={16} />
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!artist.permalink_url}
              className="w-9 h-9 rounded-full grid place-items-center border border-white/[0.1] bg-white/[0.04] text-text-tertiary hover:text-text-primary hover:bg-white/[0.08] transition-colors duration-200 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
              aria-label="скопировать ссылку"
            >
              <Icon name={copied ? 'check' : 'external-link'} size={15} />
            </button>
          </div>
        </div>
      </div>

      {description && (
        <div className="mt-4 max-w-[760px]">
          <p
            className={`text-sm text-text-secondary leading-relaxed whitespace-pre-line ${
              !expanded && isLong ? 'line-clamp-2' : ''
            }`}
          >
            {pieces.map((piece, i) =>
              piece.href ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => openUrl(piece.href!)}
                  className="text-[var(--accent-primary)] hover:underline break-all"
                >
                  {piece.text}
                </button>
              ) : (
                <span key={i}>{piece.text}</span>
              )
            )}
          </p>

          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              {expanded ? 'свернуть' : 'ещё'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
