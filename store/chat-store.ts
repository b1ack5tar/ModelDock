import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, Message, MessageAttachment } from '@/lib/types';
import {
  getDB, getConversations, getMessages, saveConversation,
  deleteConversation as dbDeleteConversation, saveMessage,
  getSettings,
} from '@/lib/db';
import {
  DEFAULT_SETTINGS,
  NEW_CONVERSATION_TITLE,
  STORAGE_KEYS,
  isNewConversationTitle,
} from '@/lib/constants';
import { createRegenerationPlan } from '@/lib/chat-utils';
import { getEffectiveMaxTokens } from '@/lib/model-utils';

interface StreamingState {
  isStreaming: boolean;
  requestId: string | null;
  conversationId: string | null;
  content: string;
  abortController: AbortController | null;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isHydrated: boolean;
  isRegenerating: boolean;
  streaming: StreamingState;

  hydrate: () => Promise<void>;
  createConversation: (providerId?: string, modelId?: string) => Promise<string>;
  setActiveConversation: (id: string | null) => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<void>;
  stopStreaming: () => void;
  discardStreaming: () => void;
  regenerateLast: () => Promise<void>;

  _persistAssistant: (conversationId: string, requestId: string, content: string) => Promise<void>;
  appendStreamToken: (conversationId: string, requestId: string, fullContent: string) => void;
  finishStreaming: (conversationId: string, requestId: string, finalContent: string) => Promise<void>;
  failStreaming: (conversationId: string, requestId: string, error: string) => Promise<void>;
}

const emptyStreamingState = (): StreamingState => ({
  isStreaming: false,
  requestId: null,
  conversationId: null,
  content: '',
  abortController: null,
});

function readActiveConversationId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.activeConversation);
}

function saveActiveConversationId(id: string | null): void {
  if (id) localStorage.setItem(STORAGE_KEYS.activeConversation, id);
  else localStorage.removeItem(STORAGE_KEYS.activeConversation);
}

function isCurrentStream(streaming: StreamingState, conversationId: string, requestId: string): boolean {
  return streaming.isStreaming
    && streaming.conversationId === conversationId
    && streaming.requestId === requestId;
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isHydrated: false,
  isRegenerating: false,
  streaming: emptyStreamingState(),

  hydrate: async () => {
    try {
      await getDB().initializeDefaults();
      const convos = await getConversations();
      const savedActiveId = readActiveConversationId();
      const activeId = savedActiveId && convos.some((c) => c.id === savedActiveId)
        ? savedActiveId : null;
      saveActiveConversationId(activeId);
      set({
        conversations: convos,
        activeConversationId: activeId,
        messages: {},
        isHydrated: true,
      });
      if (activeId) {
        const msgs = await getMessages(activeId);
        set((s) => ({ messages: { ...s.messages, [activeId]: msgs } }));
      }
    } catch (err) {
      console.error('Failed to hydrate chat store:', err);
      set({ isHydrated: true });
    }
  },

  createConversation: async (providerId, modelId) => {
    const settings = await getSettings();
    const id = uuidv4();
    const conv: Conversation = {
      id, title: NEW_CONVERSATION_TITLE,
      modelId: modelId || settings?.defaultModel || DEFAULT_SETTINGS.defaultModel,
      providerId: providerId || settings?.defaultProvider || DEFAULT_SETTINGS.defaultProvider,
      systemPrompt: settings?.defaultSystemPrompt || DEFAULT_SETTINGS.defaultSystemPrompt,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    await saveConversation(conv);
    saveActiveConversationId(id);
    set((state) => ({
      conversations: [conv, ...state.conversations],
      activeConversationId: id,
      messages: { ...state.messages, [id]: [] },
    }));
    return id;
  },

  setActiveConversation: (id) => {
    saveActiveConversationId(id);
    set({ activeConversationId: id });
    if (id) get().loadMessages(id);
  },

  deleteConversation: async (id) => {
    const activeStream = get().streaming;
    if (activeStream.conversationId === id) {
      activeStream.abortController?.abort();
      set({ streaming: emptyStreamingState() });
    }

    await dbDeleteConversation(id);
    const isActive = get().activeConversationId === id;
    if (isActive) saveActiveConversationId(null);
    set((state) => {
      const next = { ...state.messages };
      delete next[id];
      return {
        conversations: state.conversations.filter((c) => c.id !== id),
        messages: next,
        activeConversationId: isActive ? null : state.activeConversationId,
      };
    });
  },

  renameConversation: async (id, title) => {
    const conv = await getDB().conversations.get(id);
    if (conv) {
      const renamed = { ...conv, title };
      await saveConversation(renamed);
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
      }));
    }
  },

  loadMessages: async (conversationId) => {
    const msgs = await getMessages(conversationId);
    set((state) => ({ messages: { ...state.messages, [conversationId]: msgs } }));
  },

  sendMessage: async (content, attachments = []) => {
    if (get().streaming.isStreaming) return;

    let convId = get().activeConversationId;
    if (!convId) convId = await get().createConversation();

    const userMsg: Message = {
      id: uuidv4(),
      conversationId: convId,
      role: 'user',
      content,
      ...(attachments.length ? { attachments } : {}),
      createdAt: Date.now(),
    };

    const conv = await getDB().conversations.get(convId);
    if (conv) {
      const updatedConversation = {
        ...conv,
        title: isNewConversationTitle(conv.title)
          ? (content || attachments[0]?.name || NEW_CONVERSATION_TITLE).slice(0, 50)
            + (content.length > 50 ? '...' : '')
          : conv.title,
        updatedAt: Date.now(),
      };
      await saveConversation(updatedConversation);
      set((s) => ({
        conversations: sortConversations(
          s.conversations.map((c) => c.id === convId ? updatedConversation : c)
        ),
      }));
    }

    await saveMessage(userMsg);
    set((s) => ({
      messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), userMsg] },
    }));

    const abortController = new AbortController();
    const requestId = uuidv4();
    set({
      streaming: {
        isStreaming: true,
        requestId,
        conversationId: convId,
        content: '',
        abortController,
      },
    });

    const allMsgs = get().messages[convId] || [];
    const apiMessages = [
      { role: 'system', content: conv?.systemPrompt || DEFAULT_SETTINGS.defaultSystemPrompt },
      ...allMsgs.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.attachments?.length ? { attachments: m.attachments } : {}),
      })),
    ];

    const provider = await getDB().providers.get(conv?.providerId || DEFAULT_SETTINGS.defaultProvider);
    if (!provider?.apiKey) {
      await get().failStreaming(convId, requestId, '请先配置 API Key');
      return;
    }

    const settings = (await getSettings()) || DEFAULT_SETTINGS;
    const modelId = conv?.modelId || settings.defaultModel;
    const maxTokens = getEffectiveMaxTokens(provider, modelId, settings.maxTokens);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          providerConfig: provider,
          modelId,
          temperature: settings.defaultTemperature,
          maxTokens,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errBody.error || errBody.message || `请求失败 (${response.status})`);
      }

      if (!response.body) throw new Error('模型服务未返回响应内容');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isCurrentStream(get().streaming, convId, requestId)) {
          await reader.cancel();
          return;
        }
        fullContent += decoder.decode(value, { stream: true });
        get().appendStreamToken(convId, requestId, fullContent);
      }
      fullContent += decoder.decode();

      await get().finishStreaming(convId, requestId, fullContent);
    } catch (err: unknown) {
      const error = err as Error;
      if (!isCurrentStream(get().streaming, convId, requestId)) return;

      if (error.name === 'AbortError') {
        const current = get().streaming.content;
        await get().finishStreaming(
          convId,
          requestId,
          current ? current + '\n\n*[已停止]*' : '*[已取消]*'
        );
      } else {
        await get().failStreaming(convId, requestId, error.message || '请求失败');
      }
    }
  },

  stopStreaming: () => {
    get().streaming.abortController?.abort();
  },

  discardStreaming: () => {
    get().streaming.abortController?.abort();
    set({ streaming: emptyStreamingState() });
  },

  regenerateLast: async () => {
    const convId = get().activeConversationId;
    if (!convId || get().streaming.isStreaming || get().isRegenerating) return;

    set({ isRegenerating: true });
    try {
      const msgs = [...(get().messages[convId] || [])];
      const plan = createRegenerationPlan(msgs);
      if (!plan) return;

      await getDB().messages.bulkDelete(plan.messageIdsToReplace);
      set((state) => ({
        messages: { ...state.messages, [convId]: plan.retainedMessages },
      }));
      await get().sendMessage(plan.content, plan.attachments);
    } finally {
      set({ isRegenerating: false });
    }
  },

  appendStreamToken: (conversationId, requestId, fullContent) => {
    const streaming = get().streaming;
    if (!isCurrentStream(streaming, conversationId, requestId)) return;
    set({ streaming: { ...streaming, content: fullContent } });
  },

  _persistAssistant: async (conversationId, requestId, content) => {
    if (!isCurrentStream(get().streaming, conversationId, requestId)) return;

    const msg: Message = {
      id: uuidv4(), conversationId, role: 'assistant', content, createdAt: Date.now(),
    };
    await saveMessage(msg);
    if (!isCurrentStream(get().streaming, conversationId, requestId)) return;

    set((state) => ({
      messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] || []), msg] },
      streaming: emptyStreamingState(),
    }));
    set({ conversations: await getConversations() });
  },

  finishStreaming: async (convId, requestId, content) => {
    await get()._persistAssistant(convId, requestId, content);
  },
  failStreaming: async (convId, requestId, error) => {
    await get()._persistAssistant(convId, requestId, `⚠️ 错误：${error}`);
  },
}));
