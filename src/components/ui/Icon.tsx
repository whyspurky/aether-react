import { useMemo } from 'react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cache.clear();
  });
}

// проверяем, задан ли цвет в className (text-*, fill-*, stroke-*)
function hasColorClass(className: string): boolean {
  if (!className) return false;
  return className
    .split(/\s+/)
    .some((cls) => /^(?:text|fill|stroke)-/.test(cls));
}

function prepare(
  svg: string,
  size: number,
  className: string,
  filled: boolean,
): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = doc.querySelector('svg');
  if (!el) return '';
  el.removeAttribute('width');
  el.removeAttribute('height');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  if (className) el.setAttribute('class', className);

  if (filled) {
    el.setAttribute('fill', 'currentColor');
    const shapes = el.querySelectorAll('path, circle, rect, polygon, ellipse');
    shapes.forEach((shape) => {
      const currentFill = shape.getAttribute('fill');
      if (!currentFill || currentFill === 'none') {
        shape.setAttribute('fill', 'currentColor');
      }
    });
  }

  return el.outerHTML;
}

export function Icon({ name, className = '', size = 20, filled = false }: IconProps) {
  const html = useMemo(() => {
    const raw = icons[name];
    if (!raw) return '';

    // если цвет не задан явно — ставим accent по умолчанию
    const finalClassName = hasColorClass(className)
      ? className
      : `text-[var(--accent-primary)] ${className}`.trim();

    const key = `${name}|${size}|${finalClassName}|${filled ? 'f' : 's'}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const result = prepare(raw, size, finalClassName, filled);
    if (cache.size > 500) cache.clear();
    cache.set(key, result);
    return result;
  }, [name, size, className, filled]);

  if (!html) {
    return (
      <span
        className={`inline-block ${className} bg-[var(--accent-muted)] rounded animate-pulse`}
        style={{ width: size, height: size }}
      />
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}