import { Icon } from '@components/ui/Icon';

interface Props {
  text: string;
}

export function ArtistEmpty({ text }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
      <Icon name="music" size={64} className="mb-4 opacity-30" />
      <p>{text}</p>
    </div>
  );
}