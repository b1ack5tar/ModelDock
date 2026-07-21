'use client';

import { useState } from 'react';
import { useChatStore } from '@/store';
import { ConversationItem } from './conversation-item';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Settings, PanelLeftClose } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface SidebarProps {
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export function Sidebar({ onOpenSettings, onToggleSidebar }: SidebarProps) {
  const [search, setSearch] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const filtered = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const closeMobileSidebar = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      onToggleSidebar();
    }
  };

  const handleNewChat = () => {
    useChatStore.getState().setActiveConversation(null);
    closeMobileSidebar();
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    closeMobileSidebar();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      await deleteConversation(pendingDeleteId);
      toast.success('对话已删除');
    } catch (err) {
      toast.error(`删除对话失败：${(err as Error).message}`);
      throw err;
    }
  };

  const pendingDeleteConversation = conversations.find(({ id }) => id === pendingDeleteId);

  return (
    <>
      <div className="flex h-full flex-col border-r border-foreground/10 bg-card shadow-[4px_0_16px_-14px_rgba(0,0,0,0.18)] dark:shadow-[4px_0_18px_-14px_rgba(0,0,0,0.4)] lg:bg-card/35">
      {/* Header */}
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{APP_NAME}</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onOpenSettings}>
              <Settings className="w-3.5 h-3.5" />
              <span className="sr-only">打开设置</span>
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:flex h-7 w-7 rounded-lg" onClick={onToggleSidebar}>
              <PanelLeftClose className="w-3.5 h-3.5" />
              <span className="sr-only">收起侧边栏</span>
            </Button>
          </div>
        </div>

        {/* New Chat button */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-9 rounded-xl text-sm font-normal"
          onClick={handleNewChat}
        >
          <Plus className="w-4 h-4" />
          新聊天
        </Button>

        {conversations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
            <input
              type="text"
              className="w-full h-8 pl-7 pr-2 text-xs bg-muted/50 border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              placeholder="搜索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1 px-3">
        {conversations.length > 0 && (
          <p className="text-[11px] font-medium text-muted-foreground/50 px-2 pt-1 pb-2">最近</p>
        )}
        <div className="space-y-0.5 pb-2">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground/50 text-center py-12">
              {search ? '无匹配结果' : '暂无对话'}
            </p>
          )}
          {filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onClick={() => handleSelectConversation(conv.id)}
              onDelete={(e) => handleDelete(conv.id, e)}
            />
          ))}
        </div>
      </ScrollArea>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDeleteId(null);
        }}
        title="删除对话？"
        description={pendingDeleteConversation
          ? `“${pendingDeleteConversation.title}”将被永久删除，此操作无法撤销。`
          : '该对话将被永久删除，此操作无法撤销。'}
        confirmLabel="删除"
        pendingLabel="正在删除…"
        onConfirm={confirmDelete}
      />
    </>
  );
}
