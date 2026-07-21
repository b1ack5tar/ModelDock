import type { AppSettings, ProviderConfig } from './types';

export const APP_NAME = 'ModelDock';
export const APP_SLUG = 'modeldock';
export const APP_DESCRIPTION = '本地优先的多模型 AI 对话工作台';

export const DATABASE_NAME = 'modeldock';
export const MAX_OUTPUT_TOKENS = 1_000_000;

export const STORAGE_KEYS = {
  activeConversation: 'modeldock-active-conversation',
  sidebar: 'modeldock-sidebar',
} as const;

export const NEW_CONVERSATION_TITLE = '新对话';

export function isNewConversationTitle(title: string): boolean {
  return title === NEW_CONVERSATION_TITLE;
}

export const PROVIDER_ORDER = ['deepseek', 'openai', 'anthropic'];

export function isBuiltInProvider(id: string): boolean {
  return PROVIDER_ORDER.includes(id);
}

export function compareProviders(a: ProviderConfig, b: ProviderConfig): number {
  const aIndex = PROVIDER_ORDER.indexOf(a.id);
  const bIndex = PROVIDER_ORDER.indexOf(b.id);
  return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex)
    - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
    || a.name.localeCompare(b.name);
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    apiKey: '',
    models: [
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', maxTokens: 65536 },
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', maxTokens: 65536 },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    models: [
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', maxTokens: 128000 },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', maxTokens: 128000 },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', maxTokens: 128000 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: '',
    models: [
      { id: 'claude-fable-5', name: 'Claude Fable 5', maxTokens: 128000 },
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', maxTokens: 128000 },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', maxTokens: 128000 },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', maxTokens: 64000 },
    ],
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  theme: 'system',
  defaultProvider: 'deepseek',
  defaultModel: 'deepseek-v4-pro',
  defaultSystemPrompt: 'You are a helpful AI assistant.',
  defaultTemperature: 0.7,
  maxTokens: 4096,
};

export const SYSTEM_PROMPT_PRESETS = [
  { label: '通用助手', prompt: 'You are a helpful AI assistant.' },
  { label: '代码专家', prompt: 'You are a senior software engineer. Provide clean, well-documented code. Explain your design decisions.' },
  { label: '写作助手', prompt: 'You are a professional writer. Help with clear, engaging, and well-structured writing.' },
  { label: '翻译官', prompt: 'You are a professional translator. Provide accurate and natural translations while preserving tone and nuance.' },
];
