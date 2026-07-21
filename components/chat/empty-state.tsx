'use client';

import { MessageSquare } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="text-center mb-6">
      <div className="w-12 h-12 rounded-2xl bg-accent/50 flex items-center justify-center mx-auto mb-6">
        <MessageSquare className="w-5 h-5 text-accent-foreground/70" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight mb-2">有什么可以帮忙的？</h1>
      <p className="text-[15px] text-muted-foreground/60">
        在一个工作台中连接并切换多家模型服务
      </p>
    </div>
  );
}
