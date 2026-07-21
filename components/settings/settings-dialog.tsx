'use client';

import { useState } from 'react';
import { useChatStore, useSettingsStore } from '@/store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Key, Monitor, Database } from 'lucide-react';
import { toast } from 'sonner';
import { exportAllData, importAllData, clearAllData } from '@/lib/db';
import { ProvidersTab } from './tabs/providers-tab';
import { GeneralTab } from './tabs/general-tab';
import { DataTab } from './tabs/data-tab';
import { APP_SLUG, STORAGE_KEYS } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS = [
  { id: 'providers', label: 'API 提供商', icon: Key },
  { id: 'general', label: '通用设置', icon: Monitor },
  { id: 'data', label: '数据管理', icon: Database },
] as const;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('providers');
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const reHydrate = useSettingsStore((s) => s.hydrate);

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${APP_SLUG}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('数据导出成功');
    } catch (err) {
      toast.error(`导出失败：${(err as Error).message}`);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        useChatStore.getState().discardStreaming();
        await importAllData(await file.text());
        await Promise.all([useChatStore.getState().hydrate(), reHydrate()]);
        toast.success('数据导入成功');
      } catch (err) {
        toast.error(`导入失败：${(err as Error).message}`);
      }
    };
    input.click();
  };

  const handleClear = () => {
    setClearConfirmationOpen(true);
  };

  const confirmClear = async () => {
    try {
      useChatStore.getState().discardStreaming();
      await clearAllData();
      localStorage.removeItem(STORAGE_KEYS.activeConversation);
      await Promise.all([useChatStore.getState().hydrate(), reHydrate()]);
      toast.success('数据已清除');
    } catch (err) {
      toast.error(`清除失败：${(err as Error).message}`);
      throw err;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[760px] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-3rem)] sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-5 pb-4 pt-5 pr-14">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>配置 API、模型和偏好设置</DialogDescription>
        </DialogHeader>

        <div className="mx-4 flex shrink-0 gap-1 rounded-lg bg-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3">
          {activeTab === 'providers' && <ProvidersTab />}
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'data' && (
            <DataTab onExport={handleExport} onImport={handleImport} onClear={handleClear} />
          )}
        </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={clearConfirmationOpen}
        onOpenChange={setClearConfirmationOpen}
        title="清除所有数据？"
        description="所有对话、消息、提供商配置和偏好设置都将被永久删除，此操作无法撤销。"
        confirmLabel="清除所有数据"
        pendingLabel="正在清除…"
        onConfirm={confirmClear}
      />
    </>
  );
}
