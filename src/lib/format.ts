import type { Track } from '@store/types';

export const formatSec = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatMs = (ms: number): string => formatSec(ms / 1000);

type CoverSize = 't300x300' | 't500x500';

const IMG_SIZE_RE = /-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)(\.[a-z]+)?$/;

export const getCoverUrl = (track: Track | null | undefined, size: CoverSize = 't300x300'): string | null => {
  if (!track) return null;
  const raw = track.artwork_url || track.user?.avatar_url;
  if (!raw) return null;
  return raw.replace(IMG_SIZE_RE, `-${size}$2`);
};

export const upgradeCoverUrl = (url: string | undefined | null, size: CoverSize = 't500x500'): string | undefined => {
  if (!url) return undefined;
  return url.replace(IMG_SIZE_RE, `-${size}$2`);
};