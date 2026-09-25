import { ArtistTabButton } from './ArtistTabButton';

type Tab = 'all' | 'tracks' | 'playlists' | 'reposts';

interface Props {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'все' },
  { id: 'tracks', label: 'треки' },
  { id: 'playlists', label: 'плейлисты' },
  { id: 'reposts', label: 'репосты' },
];

export function ArtistTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex gap-6 ml-8">
      {TABS.map((t) => (
        <ArtistTabButton key={t.id} active={activeTab === t.id} onClick={() => onChange(t.id)}>
          {t.label}
        </ArtistTabButton>
      ))}
    </div>
  );
}