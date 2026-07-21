'use client';

import { useState } from 'react';
import type { Conversation } from '@/lib/types';
import { useChatStore } from '@/store';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2, Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function ConversationItem({ conversation, isActive, onClick, onDelete }: ConversationItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const renameConversation = useChatStore((s) => s.renameConversation);

  const handleRename = async () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      await renameConversation(conversation.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setEditTitle(conversation.title);
      setEditing(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />

      {editing ? (
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <input
            className="flex-1 h-6 px-1.5 text-sm bg-transparent border rounded focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="对话标题"
          />
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); handleRename(); }}>
            <Check className="w-3 h-3" />
            <span className="sr-only">保存标题</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); setEditTitle(conversation.title); setEditing(false); }}>
            <X className="w-3 h-3" />
            <span className="sr-only">取消编辑</span>
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate text-sm">{conversation.title}</span>
          <div className="flex items-center gap-0 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(conversation.title);
                setEditing(true);
              }}
            >
              <Pencil className="w-3 h-3" />
              <span className="sr-only">重命名对话</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-50 hover:opacity-100 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
              <span className="sr-only">删除对话</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
