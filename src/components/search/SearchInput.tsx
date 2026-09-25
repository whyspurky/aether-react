import { Icon } from '@components/ui/Icon';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="relative group">
      <Icon
        name="search"
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-text-secondary transition-colors"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="исполнители, треки"
        className="w-full py-3.5 pl-12 pr-4 bg-bg-card border border-border-subtle rounded-xl text-text-primary text-lg placeholder:text-text-tertiary outline-none focus:border-border-visible focus:bg-bg-secondary transition-all duration-200"
        autoFocus
      />
    </div>
  );
}