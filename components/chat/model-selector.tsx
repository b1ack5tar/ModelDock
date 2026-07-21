'use client';

import { useMemo } from 'react';
import { useChatStore, useSettingsStore } from '@/store';
import { getDB } from '@/lib/db';
import { compareProviders } from '@/lib/constants';
import { ChevronDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function ModelSelector() {
  const activeId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const isStreaming = useChatStore((s) => s.streaming.isStreaming);
  const rawProviders = useSettingsStore((s) => s.providers);

  const providers = useMemo(
    () => [...rawProviders].sort(compareProviders),
    [rawProviders]
  );

  const settings = useSettingsStore((s) => s.settings);
  const activeConv = conversations.find((c) => c.id === activeId);
  const currentProviderId = activeConv?.providerId || settings.defaultProvider;
  const currentModelId = activeConv?.modelId || settings.defaultModel;

  const provider = providers.find((p) => p.id === currentProviderId);
  const modelName = provider?.models.find((m) => m.id === currentModelId)?.name || currentModelId;

  const handleModelSwitch = async (provId: string, modelId: string) => {
    const prov = providers.find((p) => p.id === provId);
    if (!prov?.apiKey) {
      toast.error(`请先配置 ${prov?.name || provId} 的 API Key`);
      return;
    }
    // If no conversation active, just update default settings
    if (!activeId) {
      const { useSettingsStore } = await import('@/store');
      useSettingsStore.getState().updateSettings({ defaultProvider: provId, defaultModel: modelId });
      return;
    }
    const conv = await getDB().conversations.get(activeId);
    if (conv) {
      const updatedConversation = { ...conv, providerId: provId, modelId };
      await getDB().conversations.put(updatedConversation);
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === activeId ? { ...c, providerId: provId, modelId: modelId } : c
        ),
      }));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isStreaming}
        className="shrink-0 flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="max-w-[50vw] truncate sm:max-w-28">{modelName}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-40" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {providers.map((prov) => (
          <DropdownMenuGroup key={prov.id}>
            <DropdownMenuLabel className="text-[11px] text-muted-foreground/50 font-medium">
              {prov.name}
              {!prov.apiKey && <span className="ml-1 text-orange-400 normal-case">· 未配置</span>}
            </DropdownMenuLabel>
            {prov.models.map((model) => (
              <DropdownMenuItem
                key={`${prov.id}-${model.id}`}
                className="text-xs cursor-pointer"
                onClick={() => handleModelSwitch(prov.id, model.id)}
              >
                <span>{model.name}</span>
                {currentModelId === model.id && currentProviderId === prov.id && (
                  <span className="ml-auto text-primary text-[10px]">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
