import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function useSortableItem(id: number) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(id) });

  return {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    sortableTransform: CSS.Transform.toString(transform),
  };
}