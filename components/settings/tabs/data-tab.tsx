'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Trash2 } from 'lucide-react';

interface DataTabProps {
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function DataTab({ onExport, onImport, onClear }: DataTabProps) {
  return (
    <div className="space-y-5 pt-2 px-1">
      <div className="space-y-2">
        <Label className="text-[13px]">导出数据</Label>
        <p className="text-sm text-muted-foreground">将对话、消息和设置导出为 JSON；API Key 不会写入备份</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
          <Download className="w-3.5 h-3.5" />导出 JSON
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-[13px]">导入数据</Label>
        <p className="text-sm text-muted-foreground">从 JSON 文件恢复数据，会合并到现有数据中</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onImport}>
          <Upload className="w-3.5 h-3.5" />导入 JSON
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-[13px] text-destructive">清除所有数据</Label>
        <p className="text-sm text-muted-foreground">永久删除所有对话、消息和设置，不可撤销</p>
        <Button variant="destructive" size="sm" className="gap-2" onClick={onClear}>
          <Trash2 className="w-3.5 h-3.5" />清除所有数据
        </Button>
      </div>
    </div>
  );
}
