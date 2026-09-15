import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeSlider({ volume, onVolumeChange }: VolumeSliderProps) {
const [visible, setVisible] = useState(false);
const [isAnimating, setIsAnimating] = useState(false);
const hideTimer = useRef<NodeJS.Timeout | null>(null);
const unmountTimer = useRef<NodeJS.Timeout | null>(null);
const pendingHide = useRef(false);

const clearTimers = () => {
  if (hideTimer.current) {
    clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }
  if (unmountTimer.current) {
    clearTimeout(unmountTimer.current);
    unmountTimer.current = null;
  }
};

const show = () => {
  clearTimers();
  pendingHide.current = false;
  setVisible(true);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => setIsAnimating(true));
  });
};

const hide = () => {
  clearTimers();
  pendingHide.current = true;
  hideTimer.current = setTimeout(() => {
    if (!pendingHide.current) return;
    setIsAnimating(false);
    unmountTimer.current = setTimeout(() => setVisible(false), 200);
  }, 220);
};

useEffect(() => {
  if (!visible) return;
  const id = requestAnimationFrame(() => setIsAnimating(true));
  return () => cancelAnimationFrame(id);
}, [visible]);

useEffect(() => {
  return () => clearTimers();
}, []);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors duration-200"
      >
        <Icon name={volume === 0 ? 'volume-x' : 'volume-2'} size={18} />
      </div>

      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        className="absolute bottom-full left-1/2 -translate-x-1/2 w-full h-2"
      />

      {visible && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
className={`absolute bottom-full left-1/2 mb-2 px-4 py-3 bg-bg-card rounded-2xl border border-border-subtle shadow-xl transition-all duration-200 ease-out ${
  isAnimating
    ? 'opacity-100 translate-y-0 scale-100 -translate-x-[24px]'
    : 'opacity-0 translate-y-2 scale-95 -translate-x-[24px]'
}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className="w-full flex justify-center">
            <div className="relative" style={{ height: '140px', width: '14px' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[6px] h-full bg-[#333333] rounded-full" />
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[6px] bg-white rounded-full"
                style={{ height: `${volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[6px] h-full cursor-pointer outline-none z-10"
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                  background: 'transparent',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}