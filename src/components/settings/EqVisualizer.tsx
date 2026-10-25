import { useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EqBand } from '@store/types';

const WIDTH = 760;
const HEIGHT = 300;
const PAD = { left: 38, right: 18, top: 18, bottom: 30 };
const MIN_DB = -18;
const MAX_DB = 18;
const MIN_FREQ = 20;
const MAX_FREQ = 20_000;
const GRID_FREQ = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000];

function formatFreq(freq: number) {
  if (freq >= 1000) {
    const value = freq / 1000;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}к`;
  }
  return String(freq);
}

function xForFreq(freq: number) {
  const t = Math.log(freq / MIN_FREQ) / Math.log(MAX_FREQ / MIN_FREQ);
  return PAD.left + t * (WIDTH - PAD.left - PAD.right);
}

function yForDb(db: number) {
  const t = (db - MIN_DB) / (MAX_DB - MIN_DB);
  return PAD.top + (1 - t) * (HEIGHT - PAD.top - PAD.bottom);
}

function dbForY(y: number) {
  const t = (y - PAD.top) / (HEIGHT - PAD.top - PAD.bottom);
  return MAX_DB - t * (MAX_DB - MIN_DB);
}

function buildCurvePoints(bands: EqBand[], preampDb: number) {
  const sorted = [...bands]
    .filter((band) => band.enabled)
    .sort((a, b) => a.freq - b.freq || a.id - b.id);
  const anchorGain = preampDb;
  const points: { x: number; y: number }[] = [
    { x: xForFreq(MIN_FREQ), y: yForDb(anchorGain) },
  ];

  for (const band of sorted) {
    if (band.freq <= MIN_FREQ + 0.01) continue;
    if (band.freq >= MAX_FREQ - 0.01) continue;
    points.push({
      x: xForFreq(band.freq),
      y: yForDb(Math.max(MIN_DB, Math.min(MAX_DB, band.gainDb + preampDb))),
    });
  }

  points.push({ x: xForFreq(MAX_FREQ), y: yForDb(anchorGain) });
  return points;
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return path;
}

interface Props {
  bands: EqBand[];
  preampDb: number;
  spectrum: number[];
  onBandChange: (id: number, gainDb: number, freq: number) => void;
}

export function EqVisualizer({ bands, preampDb, spectrum, onBandChange }: Props) {
  const gradientId = `eq-fill-${useId().replace(/:/g, '')}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const curvePoints = buildCurvePoints(bands, preampDb);
  const curvePath = smoothPath(curvePoints);
  const areaPath = `${curvePath} L${WIDTH - PAD.right},${HEIGHT - PAD.bottom} L${PAD.left},${HEIGHT - PAD.bottom} Z`;

  const spectrumPoints = spectrum.map((value, index) => {
    const freq = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** (index / Math.max(1, spectrum.length - 1));
    const height = (HEIGHT - PAD.top - PAD.bottom) * Math.max(0, Math.min(1, value));
    return { x: xForFreq(freq), y: HEIGHT - PAD.bottom - height };
  });
  const spectrumPath = smoothPath(spectrumPoints);
  const spectrumArea = `${spectrumPath} L${WIDTH - PAD.right},${HEIGHT - PAD.bottom} L${PAD.left},${HEIGHT - PAD.bottom} Z`;

  const startDrag = (id: number, event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    draggingRef.current = id;
    setDragging(id);
  };

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const id = draggingRef.current;
    if (id === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    const value = Math.max(
      -18,
      Math.min(18, Math.round((dbForY(y) - preampDb) * 2) / 2)
    );
    const t = Math.max(
      0,
      Math.min(1, (x - PAD.left) / (WIDTH - PAD.left - PAD.right))
    );
    const freq = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** t;
    const roundedFreq = freq < 1000 ? Math.round(freq * 10) / 10 : Math.round(freq);
    onBandChange(id, value, roundedFreq);
  };

  const endDrag = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full select-none touch-none"
      onPointerMove={move}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="group"
      aria-label="эквалайзер и спектр трека"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />

      {GRID_FREQ.map((freq) => {
        const x = xForFreq(freq);
        return (
          <g key={`f-${freq}`}>
            <line
              x1={x}
              y1={PAD.top}
              x2={x}
              y2={HEIGHT - PAD.bottom}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={x}
              y={HEIGHT - 10}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.32)"
            >
              {formatFreq(freq)}
            </text>
          </g>
        );
      })}

      {[-12, -6, 0, 6, 12].map((db) => {
        const y = yForDb(db);
        return (
          <g key={`db-${db}`}>
            <line
              x1={PAD.left}
              y1={y}
              x2={WIDTH - PAD.right}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 7}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgba(255,255,255,0.28)"
            >
              {db > 0 ? `+${db}` : db}
            </text>
          </g>
        );
      })}

      {spectrumPath && (
        <>
          <path d={spectrumArea} fill={`url(#${gradientId})`} opacity="0.75" />
          <path
            d={spectrumPath}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
            opacity="0.35"
          />
        </>
      )}

      <path d={areaPath} fill={`url(#${gradientId})`} opacity="0.45" />
      <path
        d={curvePath}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {[...bands]
        .sort((a, b) => a.freq - b.freq || a.id - b.id)
        .map((band) => {
        const x = xForFreq(band.freq);
        const y = yForDb(Math.max(MIN_DB, Math.min(MAX_DB, band.gainDb + preampDb)));
        const active = dragging === band.id;
        return (
          <g key={band.id} opacity={band.enabled ? 1 : 0.32}>
            {active && (
              <circle cx={x} cy={y} r={13} fill="var(--accent-primary)" opacity="0.18" />
            )}
            <circle
              cx={x}
              cy={y}
              r={active ? 7.5 : 5.5}
              fill="var(--accent-primary)"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.5"
              className="cursor-move transition-[r] duration-100"
              onPointerDown={(event) => startDrag(band.id, event)}
              onDoubleClick={() => onBandChange(band.id, 0, band.freq)}
              role="slider"
              tabIndex={0}
              aria-label={`полоса ${formatFreq(band.freq)} герц`}
              aria-valuemin={-18}
              aria-valuemax={18}
              aria-valuenow={band.gainDb}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  onBandChange(band.id, band.gainDb + (event.shiftKey ? 1 : 0.5), band.freq);
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  onBandChange(band.id, band.gainDb - (event.shiftKey ? 1 : 0.5), band.freq);
                }
              }}
            />
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              fontSize="9"
              fill={active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.55)'}
            >
              {band.gainDb > 0 ? '+' : ''}
              {band.gainDb.toFixed(1)}
            </text>
          </g>
        );
      })}

      {(() => {
        const band = bands.find((item) => item.id === dragging);
        if (!band) return null;
        const width = 148;
        const x = Math.max(
          PAD.left,
          Math.min(WIDTH - PAD.right - width, xForFreq(band.freq) - width / 2)
        );
        const y = Math.max(4, yForDb(band.gainDb) - 38);
        return (
          <g className="pointer-events-none">
            <rect
              x={x}
              y={y}
              width={width}
              height={24}
              rx={12}
              fill="rgba(12,12,12,0.94)"
              stroke="rgba(255,255,255,0.16)"
            />
            <circle cx={x + 12} cy={y + 12} r={3} fill="var(--accent-primary)" />
            <text
              x={x + 21}
              y={y + 16}
              fontSize="10"
              fill="rgba(255,255,255,0.92)"
            >
              {formatFreq(band.freq)} Гц · {band.gainDb > 0 ? '+' : ''}
              {band.gainDb.toFixed(1)} дБ
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
