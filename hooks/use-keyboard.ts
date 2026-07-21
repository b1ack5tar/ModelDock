import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers: {
  onNewChat?: () => void;
  onStop?: () => void;
  onCloseSidebar?: () => void;
  isStreaming: boolean;
  sidebarOpen: boolean;
}) {
  const { onNewChat, onStop, onCloseSidebar, isStreaming, sidebarOpen } = handlers;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && !e.shiftKey && (e.code === 'Backslash' || e.key === '\\')) {
        e.preventDefault();
        e.stopPropagation();
        onNewChat?.();
        return;
      }

      if (e.code === 'Escape' || e.key === 'Escape') {
        if (isStreaming) {
          e.preventDefault();
          onStop?.();
          return;
        }
        if (sidebarOpen && window.innerWidth < 1024) {
          onCloseSidebar?.();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, sidebarOpen, onNewChat, onStop, onCloseSidebar]);
}
