import { useMemo } from 'react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

const modules = import.meta.glob('/src/assets/icons/lucide/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const icons: Record<string, string> = {};
for (const [path, raw] of Object.entries(modules)) {
  const name = path.split('/').pop()!.replace('.svg', '');
  icons[name] = raw;
}

const cache = new Map<string, string>();

function prepare(svg: string, size: number, className: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = doc.querySelector('svg');
  if (!el) return '';
  el.removeAttribute('width');
  el.removeAttribute('height');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  if (className) el.setAttribute('class', className);
  return el.outerHTML;
}

export function Icon({ name, className = '', size = 20 }: IconProps) {
  const html = useMemo(() => {
    const raw = icons[name];
    if (!raw) return '';
    const key = `${name}|${size}|${className}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const result = prepare(raw, size, className);
    cache.set(key, result);
    return result;
  }, [name, size, className]);

  if (!html) {
    return (
      <span
        className={`inline-block ${className} bg-white/10 rounded animate-pulse`}
        style={{ width: size, height: size }}
      />
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}