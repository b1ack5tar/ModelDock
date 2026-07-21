'use client';

import { useMemo } from 'react';
import { useSettingsStore } from '@/store';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sun, Moon, Monitor } from 'lucide-react';
import { MAX_OUTPUT_TOKENS, SYSTEM_PROMPT_PRESETS, compareProviders } from '@/lib/constants';
import { normalizeMaxTokens } from '@/lib/model-utils';
import type { AppSettings } from '@/lib/types';

const THEMES: { value: AppSettings['theme']; label: string; icon: typeof Sun }[] = [
  { value: 'dark', label: '暗色', icon: Moon },
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

export function GeneralTab() {
  const { settings, providers: rawProviders, updateSettings } = useSettingsStore();
  const providers = useMemo(
    () => [...rawProviders].sort(compareProviders),
    [rawProviders]
  );
  const { setTheme } = useTheme();

  return (
    <div className="space-y-5 pt-2 px-1">
      <div className="space-y-2">
        <Label className="text-sm">主题</Label>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <Button
              key={t.value}
              variant={settings.theme === t.value ? 'default' : 'outline'}
              size="sm" className="flex-1 gap-1.5"
              onClick={() => { setTheme(t.value); updateSettings({ theme: t.value }); }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">默认模型</Label>
        <Select
          value={`${settings.defaultProvider}:${settings.defaultModel}`}
          onValueChange={(val) => {
            if (!val) return;
            const [provider, model] = val.split(':');
            updateSettings({ defaultProvider: provider, defaultModel: model });
          }}
        >
          <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {providers.map((prov) =>
              prov.models.map((model) => (
                <SelectItem key={`${prov.id}:${model.id}`} value={`${prov.id}:${model.id}`}>
                  {prov.name} / {model.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">默认系统提示词</Label>
        <div className="flex gap-1.5 flex-wrap">
          {SYSTEM_PROMPT_PRESETS.map((preset) => (
            <Badge
              key={preset.label}
              variant="outline" className="cursor-pointer text-xs"
              onClick={() => updateSettings({ defaultSystemPrompt: preset.prompt })}
            >
              {preset.label}
            </Badge>
          ))}
        </div>
        <Textarea
          value={settings.defaultSystemPrompt}
          onChange={(e) => updateSettings({ defaultSystemPrompt: e.target.value })}
          rows={3} className="text-sm resize-none"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Temperature</Label>
          <span className="text-sm text-muted-foreground tabular-nums">{settings.defaultTemperature.toFixed(1)}</span>
        </div>
        <input
          type="range" min="0" max="2" step="0.1"
          value={settings.defaultTemperature}
          onChange={(e) => updateSettings({ defaultTemperature: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>精确</span><span>平衡</span><span>创意</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">最大输出 Token</Label>
        <Input
          type="number"
          min={1}
          max={MAX_OUTPUT_TOKENS}
          value={settings.maxTokens}
          onChange={(e) => {
            updateSettings({
              maxTokens: normalizeMaxTokens(Number(e.target.value), settings.maxTokens),
            });
          }}
          className="h-9 text-sm w-28"
        />
        <p className="text-xs text-muted-foreground">
          实际请求不会超过当前模型配置的最大输出 Token。
        </p>
      </div>
    </div>
  );
}
