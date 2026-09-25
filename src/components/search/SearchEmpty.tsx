import { Icon } from '@components/ui/Icon';

export function SearchEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-text-tertiary">
      <Icon name="search" size={64} className="mb-4 opacity-30" />
      <p className="text-base">начните поиск</p>
      <p className="text-sm mt-1">введите название трека или исполнителя</p>
    </div>
  );
}