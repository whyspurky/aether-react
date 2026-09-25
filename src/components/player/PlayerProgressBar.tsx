import { formatSec } from '@lib/format';

interface Props {
  displayPosition: number;
  effectiveDuration: number;
  progressPercent: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export function PlayerProgressBar({
  displayPosition,
  effectiveDuration,
  progressPercent,
  isDragging,
  onMouseDown,
  onTouchStart,
}: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-text-tertiary">
        <span>{formatSec(displayPosition)}</span>
        <span>{formatSec(effectiveDuration)}</span>
      </div>

      <div className="relative group py-1 -my-1">
        <div
          className="absolute inset-0 -top-3 -bottom-3 cursor-pointer z-10"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        />
        <div id="progress-track" className="relative h-1.5 bg-[#333333] rounded-full">
          <div
            id="progress-fill"
            className="absolute left-0 top-0 h-full bg-white rounded-full will-change-transform"
            style={{ width: `${progressPercent}%`, transition: 'none' }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none will-change-transform ${
              isDragging
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'
            }`}
            style={{
              left: `calc(${progressPercent}% - 8px)`,
              transition: 'opacity 0.15s ease, transform 0.15s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}