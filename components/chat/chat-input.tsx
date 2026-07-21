'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useChatStore } from '@/store';
import { ModelSelector } from './model-selector';
import { FileText, Paperclip, Send, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageAttachment } from '@/lib/types';
import {
  ATTACHMENT_ACCEPT,
  formatAttachmentSize,
  isImageAttachment,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENTS_TOTAL_BYTES,
  MAX_TEXT_ATTACHMENT_BYTES,
  normalizeAttachmentMediaType,
} from '@/lib/attachments';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('无法读取文件'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('无法读取文件'));
    reader.readAsDataURL(file);
  });
}

export function ChatInput() {
  const [input, setInput] = useState('');
  const [isDocked, setIsDocked] = useState(false);
  const [dockedHeight, setDockedHeight] = useState(0);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const keyboardBaselineRef = useRef(0);
  const undockCleanupRef = useRef<(() => void) | null>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const streaming = useChatStore((s) => s.streaming);

  const isStreaming = streaming.isStreaming;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  useEffect(() => () => undockCleanupRef.current?.(), []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming) return;
    const pendingAttachments = attachments;
    setInput('');
    setAttachments([]);
    await sendMessage(trimmed, pendingAttachments);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    const availableSlots = MAX_ATTACHMENT_COUNT - attachments.length;
    if (availableSlots <= 0) {
      toast.error(`每次最多添加 ${MAX_ATTACHMENT_COUNT} 个文件`);
      return;
    }

    const next = [...attachments];
    let totalSize = next.reduce((sum, attachment) => sum + attachment.size, 0);

    for (const file of files.slice(0, availableSlots)) {
      const mediaType = normalizeAttachmentMediaType(file.name, file.type);
      if (!mediaType) {
        toast.error(`${file.name}：暂不支持该文件类型`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name}：文件不能超过 ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)}`);
        continue;
      }
      if (mediaType === 'text/plain' && file.size > MAX_TEXT_ATTACHMENT_BYTES) {
        toast.error(`${file.name}：文本文件不能超过 ${formatAttachmentSize(MAX_TEXT_ATTACHMENT_BYTES)}`);
        continue;
      }
      if (totalSize + file.size > MAX_ATTACHMENTS_TOTAL_BYTES) {
        toast.error(`附件总大小不能超过 ${formatAttachmentSize(MAX_ATTACHMENTS_TOTAL_BYTES)}`);
        break;
      }

      try {
        next.push({
          id: uuidv4(),
          name: file.name,
          mediaType,
          size: file.size,
          data: await readFileAsBase64(file),
        });
        totalSize += file.size;
      } catch {
        toast.error(`${file.name}：读取失败`);
      }
    }

    if (files.length > availableSlots) {
      toast.error(`每次最多添加 ${MAX_ATTACHMENT_COUNT} 个文件`);
    }
    setAttachments(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      undockCleanupRef.current?.();
      const viewport = window.visualViewport;
      keyboardBaselineRef.current = Math.max(window.innerHeight, viewport?.height || 0);
      setDockedHeight(containerRef.current?.getBoundingClientRect().height || 0);
      setIsDocked(true);
    }
  };

  const handleBlur = () => {
    window.requestAnimationFrame(() => {
      if (document.activeElement === textareaRef.current) return;

      const viewport = window.visualViewport;
      const baseline = keyboardBaselineRef.current;
      if (!viewport || baseline - viewport.height <= 80) {
        setIsDocked(false);
        return;
      }

      let timeoutId = 0;
      const finishUndocking = () => {
        viewport.removeEventListener('resize', handleViewportResize);
        window.clearTimeout(timeoutId);
        undockCleanupRef.current = null;
        setIsDocked(false);
      };
      const handleViewportResize = () => {
        if (baseline - viewport.height <= 40) finishUndocking();
      };

      viewport.addEventListener('resize', handleViewportResize);
      timeoutId = window.setTimeout(finishUndocking, 700);
      undockCleanupRef.current = () => {
        viewport.removeEventListener('resize', handleViewportResize);
        window.clearTimeout(timeoutId);
      };
    });
  };

  const preserveKeyboard = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div
      className="w-full shrink-0"
      style={isDocked ? { height: `${dockedHeight}px` } : undefined}
    >
      <div
        ref={containerRef}
        className={cn(
          'mx-auto w-full max-w-[800px] shrink-0 px-2 pt-1.5 transition-[padding] sm:px-4 sm:pb-4 sm:pt-2',
          isDocked ? 'pb-0.5' : 'pb-[max(0.125rem,env(safe-area-inset-bottom))]',
          isDocked && 'absolute inset-x-0 z-30 bg-background'
        )}
        style={isDocked ? { bottom: 'var(--keyboard-inset, 0px)' } : undefined}
      >
        <div className="flex flex-col items-stretch gap-1.5 rounded-[24px] border border-foreground/15 bg-card px-3 py-2 shadow-xl shadow-black/10 transition-all focus-within:border-foreground/25 focus-within:shadow-2xl dark:shadow-black/40 sm:px-4 sm:py-3">
          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="已添加的文件">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative flex h-14 min-w-0 max-w-48 shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-muted/40 p-1.5 pr-8"
                >
                  {isImageAttachment(attachment.mediaType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:${attachment.mediaType};base64,${attachment.data}`}
                      alt=""
                      className="size-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
                      <FileText className="size-5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{attachment.name}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {formatAttachmentSize(attachment.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))}
                    aria-label={`移除 ${attachment.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="输入消息..."
            rows={1}
            enterKeyHint="send"
            className="chat-input-textarea min-h-8 max-h-[160px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 py-1 text-[16px] leading-6 outline-none placeholder:text-muted-foreground/40 sm:text-[15px]"
            aria-label="消息内容"
          />

          <div className="flex w-full items-center justify-between">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                multiple
                className="hidden"
                onChange={handleFilesSelected}
                disabled={isStreaming}
              />
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || attachments.length >= MAX_ATTACHMENT_COUNT}
                aria-label="添加文件"
                title="添加图片、PDF 或文本文件"
              >
                <Paperclip className="size-4.5" />
              </button>
            </div>

            <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5">
              <ModelSelector />

              {isStreaming ? (
                <button
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                  onPointerDown={preserveKeyboard}
                  onClick={stopStreaming}
                  aria-label="停止生成"
                >
                  <Square className="size-3.5" />
                </button>
              ) : (
                <button
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
                  onPointerDown={preserveKeyboard}
                  onClick={handleSend}
                  disabled={!input.trim() && attachments.length === 0}
                  aria-label="发送消息"
                >
                  <Send className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
