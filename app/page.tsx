'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChatStore, useSettingsStore } from '@/store';
import { useTheme } from 'next-themes';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatArea } from '@/components/chat/chat-area';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSidebarReady, setIsSidebarReady] = useState(false);

  const toggleSidebar = useCallback((open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem(STORAGE_KEYS.sidebar, open ? 'open' : 'closed');
  }, []);

  const hydrateChat = useChatStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const isChatHydrated = useChatStore((s) => s.isHydrated);
  const isSettingsHydrated = useSettingsStore((s) => s.isHydrated);
  const settings = useSettingsStore((s) => s.settings);
  const { setTheme } = useTheme();
  const isStreaming = useChatStore((s) => s.streaming.isStreaming);
  const stopStreaming = useChatStore((s) => s.stopStreaming);

  useEffect(() => {
    Promise.all([hydrateChat(), hydrateSettings()]);
  }, [hydrateChat, hydrateSettings]);

  useEffect(() => {
    const sidebarPreference = localStorage.getItem(STORAGE_KEYS.sidebar);
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    const animationFrame = requestAnimationFrame(() => {
      setSidebarOpen(isMobile ? false : sidebarPreference !== 'closed');
      setIsSidebarReady(true);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (isSettingsHydrated && settings.theme) {
      setTheme(settings.theme);
    }
  }, [isSettingsHydrated, settings.theme, setTheme]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let layoutHeight = Math.max(window.innerHeight, viewport.height);

    const syncVisualViewport = () => {
      const minimumUsableHeight = Math.max(180, layoutHeight * 0.35);
      if (!Number.isFinite(viewport.height) || viewport.height < minimumUsableHeight) return;
      const viewportReduction = Math.max(0, layoutHeight - viewport.height);
      const keyboardInset = viewportReduction > 80 ? viewportReduction : 0;

      document.documentElement.style.setProperty('--app-layout-height', `${layoutHeight}px`);
      document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
    };

    const resetLayoutHeight = () => {
      window.setTimeout(() => {
        layoutHeight = Math.max(window.innerHeight, viewport.height);
        syncVisualViewport();
      }, 150);
    };

    syncVisualViewport();
    viewport.addEventListener('resize', syncVisualViewport);
    window.addEventListener('focusin', syncVisualViewport);
    window.addEventListener('focusout', syncVisualViewport);
    window.addEventListener('orientationchange', resetLayoutHeight);
    return () => {
      viewport.removeEventListener('resize', syncVisualViewport);
      window.removeEventListener('focusin', syncVisualViewport);
      window.removeEventListener('focusout', syncVisualViewport);
      window.removeEventListener('orientationchange', resetLayoutHeight);
      document.documentElement.style.removeProperty('--app-layout-height');
      document.documentElement.style.removeProperty('--keyboard-inset');
    };
  }, []);

  useKeyboardShortcuts({
    onNewChat: () => useChatStore.getState().setActiveConversation(null),
    onStop: stopStreaming,
    onCloseSidebar: () => toggleSidebar(false),
    isStreaming,
    sidebarOpen,
  });

  if (!isChatHydrated || !isSettingsHydrated || !isSidebarReady) {
    return <div className="h-screen bg-background" aria-hidden="true" />;
  }

  return (
    <div
      className="relative flex overflow-hidden bg-background"
      style={{
        height: 'var(--app-layout-height, 100dvh)',
      }}
    >
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => toggleSidebar(false)}
      />

      <div
        className={cn(
          'fixed lg:relative z-50 h-full w-72 transition-[transform,width] duration-300',
          sidebarOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:w-0 lg:overflow-hidden'
        )}
      >
        <Sidebar
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSidebar={() => toggleSidebar(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border/15">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toggleSidebar(!sidebarOpen)}>
            <Menu className="w-4 h-4" />
            <span className="sr-only">切换侧边栏</span>
          </Button>
          <span className="text-xs font-medium text-muted-foreground">对话</span>
        </div>
        <ChatArea />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {!sidebarOpen && (
        <button
          className="hidden lg:flex fixed top-4 left-4 z-30 w-9 h-9 items-center justify-center rounded-xl bg-background border border-border/15 shadow-sm text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors"
          onClick={() => toggleSidebar(true)}
          aria-label="打开侧边栏"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
