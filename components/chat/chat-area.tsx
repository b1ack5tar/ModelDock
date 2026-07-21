'use client';

import { useChatStore } from '@/store';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { EmptyState } from './empty-state';

export function ChatArea() {
  const activeId = useChatStore((s) => s.activeConversationId);
  const messages = useChatStore((s) => (activeId ? s.messages[activeId] : undefined));
  const hasMessages = Boolean(messages && messages.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasMessages ? (
        <MessageList />
      ) : (
        <>
        <div className="flex-1" />
          {!activeId && <EmptyState />}
        </>
      )}
      <ChatInput />
      {!hasMessages && <div className="flex-[2]" />}
    </div>
  );
}
