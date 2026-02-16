import { useEffect } from 'react';

interface ShortcutActions {
  onUpload?: () => void;
  onExport?: () => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts({ onUpload, onExport, onSave }: ShortcutActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      switch (e.key.toLowerCase()) {
        case 'o':
          if (onUpload) { e.preventDefault(); onUpload(); }
          break;
        case 'e':
          if (onExport) { e.preventDefault(); onExport(); }
          break;
        case 's':
          if (onSave) { e.preventDefault(); onSave(); }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUpload, onExport, onSave]);
}
