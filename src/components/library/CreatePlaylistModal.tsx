import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  maxLength: number;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreatePlaylistModal({ isOpen, maxLength, onClose, onCreate }: Props) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] animate-modal-backdrop"
      onClick={handleClose}
    >
      <div
        className="bg-white/[0.06] backdrop-blur-2xl rounded-xl p-6 w-96 max-w-[90vw] border border-border-subtle shadow-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4 text-text-primary">новый плейлист</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="название плейлиста"
          className="w-full px-4 py-2 bg-white/[0.04] border border-border-subtle rounded-lg outline-none focus:border-border-visible focus:bg-white/[0.06] mb-4 text-text-primary placeholder:text-text-tertiary"
          autoFocus
          maxLength={maxLength}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-text-tertiary hover:bg-white/[0.06] transition"
          >
            отмена
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg bg-white/[0.08] text-text-primary hover:bg-white/[0.14] transition"
          >
            создать
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}