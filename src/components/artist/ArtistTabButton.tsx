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
        onClick={onClick}
        className={`relative py-3 text-sm font-medium transition-colors duration-200 ${
          active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        {children}
      </button>
    );
  }
);

ArtistTabButton.displayName = 'ArtistTabButton';