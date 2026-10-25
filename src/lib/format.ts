import type { Track } from '@store/types';

export const formatSec = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatMs = (ms: number): string => formatSec(ms / 1000);

type CoverSize = 't200x200' | 't300x300' | 't500x500';

const IMG_SIZE_RE = /-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)(\.[a-z]+)?$/;

const COVER_RANK: Record<CoverSize, number> = {
  't200x200': 200,
  't300x300': 300,
  't500x500': 500,
};

// потолок качества задаётся в настройках производительности
let coverQuality: CoverSize = 't500x500';

export const setCoverQuality = (quality: CoverSize) => {
  coverQuality = quality;
};

const clampCover = (size: CoverSize): CoverSize =>
  COVER_RANK[size] <= COVER_RANK[coverQuality] ? size : coverQuality;

export const getCoverUrl = (track: Track | null | undefined, size: CoverSize = 't300x300'): string | null => {
  if (!track) return null;
  const raw = track.artwork_url || track.user?.avatar_url;
  if (!raw) return null;
  return raw.replace(IMG_SIZE_RE, `-${clampCover(size)}$2`);
};

export const upgradeCoverUrl = (url: string | undefined | null, size: CoverSize = 't500x500'): string | undefined => {
  if (!url) return undefined;
  return url.replace(IMG_SIZE_RE, `-${clampCover(size)}$2`);
};

const compactNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

// 1200 -> 1,2 тыс, 3_400_000 -> 3,4 млн
export const formatCount = (n: number | null | undefined): string => {
  if (!n || n < 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${compactNumber.format(n / 1000)} тыс`;
  return `${compactNumber.format(n / 1_000_000)} млн`;
};

// 3_725_000 -> 1 ч 2 мин, 421_000 -> 7 мин
export const formatDuration = (ms: number | null | undefined): string => {
  if (!ms || ms < 0) return '';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин`;
  return `${total} сек`;
};

export const formatYear = (value: string | number | null | undefined): string => {
  if (!value) return '';
  if (typeof value === 'number') return String(value);
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return String(d.getFullYear());
};

export const formatDate = (value: string | number | null | undefined): string => {
  if (!value) return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ссылки в описании артиста, без html
export type DescriptionPiece = { text: string; href?: string };

export const splitDescriptionLinks = (text: string): DescriptionPiece[] => {
  const pieces: DescriptionPiece[] = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) pieces.push({ text: text.slice(last, match.index) });
    pieces.push({ text: match[0], href: match[0] });
    last = match.index + match[0].length;
  }

  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
};
