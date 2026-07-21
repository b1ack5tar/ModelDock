'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { toast } from 'sonner';
import { copyText } from '@/lib/clipboard';

interface MessageMarkdownProps {
  content: string;
}

export const MessageMarkdown = memo(function MessageMarkdown({ content }: MessageMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: ({ children }) => (
          <div className="relative group my-2">
            <pre className="bg-background border rounded-xl p-3 overflow-x-auto text-[13px] font-mono leading-relaxed">
              {children}
            </pre>
            <button
              className="absolute top-2 right-2 px-2 py-0.5 text-[10px] bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={async (e) => {
                const code = (e.currentTarget.previousElementSibling as HTMLElement)?.textContent || '';
                try {
                  await copyText(code);
                  toast.success('代码已复制');
                } catch {
                  toast.error('复制失败，请重试');
                }
              }}
            >
              复制
            </button>
          </div>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-[13px] font-mono">{children}</code>
          ) : (
            <code className="text-[13px] font-mono">{children}</code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-[15px] border-collapse border border-border/50 rounded-lg overflow-hidden">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border/50 bg-muted/50 px-3 py-1.5 text-left font-medium">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-border/50 px-3 py-1.5">{children}</td>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic text-[15px]">{children}</blockquote>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside my-1.5 space-y-0.5 text-[15px]">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside my-1.5 space-y-0.5 text-[15px]">{children}</ol>,
        h1: ({ children }) => <h1 className="text-base font-semibold mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-medium mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="leading-relaxed text-[15px] [&:not(:last-child)]:mb-1.5">{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
