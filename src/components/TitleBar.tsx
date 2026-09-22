import { Icon } from './Icon';

interface TitleBarProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

const btnClass =
  'w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary hover:bg-glass-bg hover:text-text-primary transition-all duration-200';

export function TitleBar({ onMinimize, onMaximize, onClose }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-bg-secondary/90 backdrop-blur-xl z-30"
    >
      <div className="flex items-center gap-2.5" data-tauri-drag-region>
        <span className="text-sm font-semibold text-text-primary">aether</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={onMinimize} className={btnClass} title="свернуть">
          <Icon name="minus" size={14} />
        </button>
        <button onClick={onMaximize} className={btnClass} title="развернуть">
          <Icon name="square" size={14} />
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary hover:bg-red-600 hover:text-white transition-all duration-200"
          title="закрыть"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}