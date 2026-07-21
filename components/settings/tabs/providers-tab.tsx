'use client';

import { useState, useMemo } from 'react';
import { useChatStore, useSettingsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ModelConfig, ProviderConfig } from '@/lib/types';
import { MAX_OUTPUT_TOKENS, compareProviders, isBuiltInProvider } from '@/lib/constants';
import { normalizeMaxTokens } from '@/lib/model-utils';
import { Plus, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export function ProvidersTab() {
  const {
    providers: rawProviders,
    addProvider,
    updateProvider,
    removeProvider,
    setApiKey,
  } = useSettingsStore();
  const conversations = useChatStore((state) => state.conversations);
  const providers = useMemo(
    () => [...rawProviders].sort(compareProviders),
    [rawProviders]
  );
  const [selectedProviderId, setSelectedProviderId] = useState(providers[0]?.id || 'deepseek');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [pendingDeleteProviderId, setPendingDeleteProviderId] = useState<string | null>(null);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddProvider = async () => {
    const provider: ProviderConfig = {
      id: `custom-${uuidv4()}`,
      name: '自定义提供商',
      baseURL: '',
      apiKey: '',
      models: [],
    };

    try {
      await addProvider(provider);
      setSelectedProviderId(provider.id);
      setPendingDeleteProviderId(null);
      toast.success('已添加自定义提供商');
    } catch (err) {
      toast.error(`添加提供商失败：${(err as Error).message}`);
    }
  };

  const handleRemoveProvider = async () => {
    if (!selectedProvider || isBuiltInProvider(selectedProvider.id)) return;

    if (conversations.some(({ providerId }) => providerId === selectedProvider.id)) {
      toast.error('该提供商仍被对话使用，请先切换或删除相关对话');
      return;
    }

    if (pendingDeleteProviderId !== selectedProvider.id) {
      setPendingDeleteProviderId(selectedProvider.id);
      return;
    }

    const fallback = providers.find(({ id }) => id !== selectedProvider.id);
    try {
      await removeProvider(selectedProvider.id);
      setSelectedProviderId(fallback?.id || 'deepseek');
      setPendingDeleteProviderId(null);
      toast.success('提供商已删除');
    } catch (err) {
      toast.error(`删除提供商失败：${(err as Error).message}`);
    }
  };

  const addModel = () => {
    if (!selectedProvider) return;
    const newModel: ModelConfig = {
      id: `custom-${uuidv4().slice(0, 8)}`,
      name: '新模型',
      maxTokens: 65536,
    };
    updateProvider(selectedProvider.id, { models: [...selectedProvider.models, newModel] });
  };

  const updateModel = (idx: number, field: keyof ModelConfig, value: string) => {
    if (!selectedProvider) return;
    const models = [...selectedProvider.models];
    models[idx] = {
      ...models[idx],
      [field]: field === 'maxTokens'
        ? normalizeMaxTokens(Number(value), models[idx].maxTokens)
        : value,
    };
    updateProvider(selectedProvider.id, { models });
  };

  const removeModel = (idx: number) => {
    if (!selectedProvider) return;
    updateProvider(selectedProvider.id, { models: selectedProvider.models.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-5 px-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {providers.map((prov) => (
            <Badge
              key={prov.id}
              variant={selectedProviderId === prov.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                setSelectedProviderId(prov.id);
                setPendingDeleteProviderId(null);
              }}
            >
              {prov.name}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full shrink-0 gap-1.5 sm:w-auto"
          onClick={handleAddProvider}
        >
          <Plus className="w-3.5 h-3.5" />
          添加提供商
        </Button>
      </div>

      {selectedProvider && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm">提供商名称</Label>
              {!isBuiltInProvider(selectedProvider.id) && (
                <div className="flex items-center gap-1">
                  {pendingDeleteProviderId === selectedProvider.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => setPendingDeleteProviderId(null)}
                    >
                      取消
                    </Button>
                  )}
                  <Button
                    variant={pendingDeleteProviderId === selectedProvider.id ? 'destructive' : 'ghost'}
                    size="sm"
                    className={pendingDeleteProviderId === selectedProvider.id
                      ? 'h-7 gap-1.5'
                      : 'h-7 gap-1.5 text-muted-foreground hover:text-destructive'}
                    onClick={handleRemoveProvider}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {pendingDeleteProviderId === selectedProvider.id ? '确认删除' : '删除提供商'}
                  </Button>
                </div>
              )}
            </div>
            <Input
              value={selectedProvider.name}
              onChange={(e) => updateProvider(selectedProvider.id, { name: e.target.value })}
              placeholder="提供商名称"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">API Key</Label>
            <div className="relative">
              <Input
                type={showKeys[selectedProvider.id] ? 'text' : 'password'}
                value={selectedProvider.apiKey}
                onChange={(e) => setApiKey(selectedProvider.id, e.target.value)}
                placeholder={`输入 ${selectedProvider.name} API Key...`}
                className="h-9 text-sm pr-10"
              />
              <Button
                variant="ghost" size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => toggleShowKey(selectedProvider.id)}
                aria-label={showKeys[selectedProvider.id] ? '隐藏 API Key' : '显示 API Key'}
              >
                {showKeys[selectedProvider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Base URL</Label>
            <Input
              value={selectedProvider.baseURL}
              onChange={(e) => updateProvider(selectedProvider.id, { baseURL: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="h-9 text-sm"
            />
            {!isBuiltInProvider(selectedProvider.id) && (
              <p className="text-xs text-muted-foreground">
                自定义提供商使用 OpenAI Chat Completions 兼容协议。
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">模型列表</Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addModel}>
                <Plus className="w-3.5 h-3.5" />
                <span className="sr-only">添加模型</span>
              </Button>
            </div>
            <div className="space-y-2">
              {selectedProvider.models.length === 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  暂无模型，请点击右上角的加号添加模型 ID
                </p>
              )}
              {selectedProvider.models.length > 0 && (
                <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_10rem_8rem_1.75rem] gap-2 px-1 text-[11px] text-muted-foreground">
                  <span>模型 ID</span>
                  <span>显示名称</span>
                  <span>最大输出 Token</span>
                  <span />
                </div>
              )}
              {selectedProvider.models.map((model, idx) => (
                <div
                  key={`${selectedProvider.id}-${idx}`}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_1.75rem] sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="text-[11px] text-muted-foreground sm:hidden">模型 ID</span>
                    <Input
                      value={model.id}
                      onChange={(e) => updateModel(idx, 'id', e.target.value)}
                      className="h-8 min-w-0 text-sm"
                      placeholder="Model ID"
                      aria-label={`${model.name} 模型 ID`}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <span className="text-[11px] text-muted-foreground sm:hidden">显示名称</span>
                    <Input
                      value={model.name}
                      onChange={(e) => updateModel(idx, 'name', e.target.value)}
                      className="h-8 text-sm"
                      placeholder="显示名称"
                      aria-label={`${model.name} 显示名称`}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <span className="text-[11px] text-muted-foreground sm:hidden">最大输出 Token</span>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_OUTPUT_TOKENS}
                      value={model.maxTokens}
                      onChange={(e) => updateModel(idx, 'maxTokens', e.target.value)}
                      className="h-8 text-sm tabular-nums"
                      aria-label={`${model.name} 最大输出 Token`}
                    />
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 justify-self-end text-muted-foreground hover:text-destructive sm:justify-self-auto"
                    onClick={() => removeModel(idx)}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="sr-only">删除模型</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
