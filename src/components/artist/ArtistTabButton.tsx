interface Props {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function ArtistTabButton({ active, onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-sm font-medium transition-colors duration-200 ${
        active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-text-primary rounded-full" />
      )}
    </button>
  );
}