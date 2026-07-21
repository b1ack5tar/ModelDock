'use client';

import type { Message } from '@/lib/types';
import { MessageMarkdown } from './message-markdown';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { formatAttachmentSize, isImageAttachment } from '@/lib/attachments';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const renderContent = () => {
    if (isUser) {
      return message.content
        ? <p className="whitespace-pre-wrap break-words">{message.content}</p>
        : null;
    }
    if (isStreaming && !message.content) return <LoadingDots />;
    return <MessageMarkdown content={message.content} />;
  };

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
          isUser
            ? 'max-w-[80%] bg-accent text-accent-foreground rounded-2xl rounded-br-md'
            : 'w-full max-w-none rounded-2xl rounded-bl-md'
        )}
      >
        {message.attachments && message.attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', message.content && 'mb-2')}>
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`data:${attachment.mediaType};base64,${attachment.data}`}
                download={attachment.name}
                className="flex min-w-0 max-w-56 items-center gap-2 rounded-xl border border-border/40 bg-background/50 p-1.5 pr-3 hover:bg-background/80"
                title={`下载 ${attachment.name}`}
              >
                {isImageAttachment(attachment.mediaType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${attachment.mediaType};base64,${attachment.data}`}
                    alt={attachment.name}
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                    <FileText className="size-5" />
                  </span>
                )}
                <span className="min-w-0 text-left">
                  <span className="block truncate text-xs font-medium">{attachment.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {formatAttachmentSize(attachment.size)}
                  </span>
                </span>
              </a>
            ))}
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}
