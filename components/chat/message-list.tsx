'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '@/store';
import { MessageBubble } from './message-bubble';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDown, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { copyText } from '@/lib/clipboard';

export function MessageList() {
  const activeId = useChatStore((s) => s.activeConversationId);
  const messages = useChatStore(
    useShallow((s) => (activeId ? s.messages[activeId] || [] : []))
  );
  const streaming = useChatStore((s) => s.streaming);
  const isRegenerating = useChatStore((s) => s.isRegenerating);
  const regenerateLast = useChatStore((s) => s.regenerateLast);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Auto-scroll when new messages arrive or streaming updates — only if already near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom(true);
    }
  }, [messages, streaming.content, isNearBottom, scrollToBottom]);

  // Detect scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsNearBottom(scrollHeight - scrollTop - clientHeight < 4);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (!activeId) return null;

  const showScrollButton = !isNearBottom && messages.length > 0;
  const lastMessage = messages.at(-1);

  const handleCopy = async (content: string) => {
    if (!content) return;

    try {
      await copyText(content);
      toast.success('回复已复制');
    } catch {
      toast.error('复制失败，请重试');
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerateLast();
    } catch (err) {
      toast.error(`重新生成失败：${(err as Error).message}`);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    const currentY = event.touches[0]?.clientY;
    if (startY === null || currentY === undefined || currentY - startY < 12) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLTextAreaElement
      && window.matchMedia('(max-width: 1023px)').matches) {
      activeElement.blur();
      touchStartYRef.current = null;
    }
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        className="h-full touch-pan-y overflow-y-auto overscroll-y-contain"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { touchStartYRef.current = null; }}
      >
        <div className="max-w-[800px] mx-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !streaming.isStreaming && (
          <div className="flex items-center justify-center h-full py-20">
            <p className="text-sm text-muted-foreground/30">发送消息开始对话</p>
          </div>
        )}

        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const canRegenerate = msg.id === lastMessage?.id && !streaming.isStreaming;

          return (
            <div key={msg.id} className="space-y-1">
              <MessageBubble message={msg} />
              {isAssistant && (
                <div className="flex items-center gap-1 pl-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    onClick={() => handleCopy(msg.content)}
                    aria-label="复制此回复"
                    title="复制"
                  >
                    <Copy className="size-4" />
                  </button>
                  {canRegenerate && (
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs leading-none text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      aria-label="重新生成上一条回复"
                    >
                      <RotateCcw className={`size-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      {isRegenerating ? '正在重新生成' : '重新生成'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {streaming.isStreaming && streaming.conversationId === activeId && (
          <MessageBubble
            message={{
              id: 'streaming',
              conversationId: activeId,
              role: 'assistant',
              content: streaming.content,
              createdAt: 0,
            }}
            isStreaming={!streaming.content}
          />
        )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <button
          className="absolute bottom-3 left-1/2 z-20 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border/50 bg-background/95 text-muted-foreground shadow-lg backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] hover:border-border hover:bg-background hover:text-foreground hover:shadow-xl"
          onClick={() => { scrollToBottom(true); setIsNearBottom(true); }}
          aria-label="滚动到最新消息"
          title="滚动到最新消息"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
