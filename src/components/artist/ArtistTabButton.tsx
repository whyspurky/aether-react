import { forwardRef } from 'react';

interface Props {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const ArtistTabButton = forwardRef<HTMLButtonElement, Props>(
  ({ active, onClick, children }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        tabIndex={active ? 0 : -1}
        onClick={onClick}
        className={`relative py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:text-text-primary ${
          active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        <span className="flex items-center">{children}</span>
      </button>
    );
  }
);

ArtistTabButton.displayName = 'ArtistTabButton';
