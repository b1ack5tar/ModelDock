// ============================================================
// Core data types for ModelDock
// ============================================================

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  providerId: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
  createdAt: number;
}

export interface MessageAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  data: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
}

export interface AppSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  defaultProvider: string;
  defaultModel: string;
  defaultSystemPrompt: string;
  defaultTemperature: number;
  maxTokens: number;
}
