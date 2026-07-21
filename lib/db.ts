// ============================================================
// Dexie.js — IndexedDB database layer
// ============================================================

import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  Conversation,
  Message,
  MessageAttachment,
  ProviderConfig,
} from './types';
import {
  DATABASE_NAME,
  DEFAULT_SETTINGS,
  DEFAULT_PROVIDERS,
  MAX_OUTPUT_TOKENS,
} from './constants';

const DB_SCHEMA = {
  conversations: 'id, updatedAt',
  messages: 'id, conversationId, [conversationId+createdAt]',
  settings: 'id',
  providers: 'id',
};

const BACKUP_VERSION = 3;

export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;
  settings!: Table<AppSettings, string>;
  providers!: Table<ProviderConfig, string>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores(DB_SCHEMA);
    this.version(2).stores(DB_SCHEMA).upgrade(async (transaction) => {
      const providers = transaction.table<ProviderConfig, string>('providers');
      const anthropicDefaults = DEFAULT_PROVIDERS.find(({ id }) => id === 'anthropic');
      const existing = await providers.get('anthropic');

      if (!existing || !anthropicDefaults) return;

      const existingModelIds = new Set(existing.models.map(({ id }) => id));
      const newModels = anthropicDefaults.models.filter(({ id }) => !existingModelIds.has(id));

      if (newModels.length > 0) {
        await providers.put({
          ...existing,
          models: [...newModels, ...existing.models],
        });
      }
    });
  }

  async initializeDefaults(): Promise<void> {
    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.put({ ...DEFAULT_SETTINGS });
    }

    const providers = await this.providers.toArray();
    const existingProviderIds = new Set(providers.map(({ id }) => id));
    const missingProviders = DEFAULT_PROVIDERS.filter(({ id }) => !existingProviderIds.has(id));
    if (missingProviders.length > 0) {
      await this.providers.bulkPut(missingProviders);
    }
  }
}

// Singleton instance (created lazily to avoid SSR issues)
let dbInstance: ChatDatabase | null = null;

export function getDB(): ChatDatabase {
  if (!dbInstance) {
    dbInstance = new ChatDatabase();
  }
  return dbInstance;
}

// ============================================================
// CRUD Helpers
// ============================================================

export async function getConversations(): Promise<Conversation[]> {
  return getDB().conversations.orderBy('updatedAt').reverse().toArray();
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await getDB().conversations.put(conv);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', [db.conversations, db.messages], async () => {
    await db.conversations.delete(id);
    await db.messages.where('conversationId').equals(id).delete();
  });
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return getDB().messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('createdAt');
}

export async function saveMessage(msg: Message): Promise<void> {
  await getDB().messages.put(msg);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  return getDB().settings.get('default');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await getDB().settings.put({ ...settings, id: 'default' });
}

export async function getProviders(): Promise<ProviderConfig[]> {
  return getDB().providers.toArray();
}

export async function saveProvider(provider: ProviderConfig): Promise<void> {
  await getDB().providers.put(provider);
}

export async function deleteProvider(id: string): Promise<void> {
  await getDB().providers.delete(id);
}

export async function exportAllData(): Promise<string> {
  const [conversations, messages, settings, providers] = await Promise.all([
    getDB().conversations.toArray(),
    getDB().messages.toArray(),
    getDB().settings.toArray(),
    getDB().providers.toArray(),
  ]);
  return JSON.stringify(
    {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      secretsIncluded: false,
      conversations,
      messages,
      settings,
      providers: providers.map((provider) => ({ ...provider, apiKey: '' })),
    },
    null,
    2
  );
}

export async function importAllData(json: string): Promise<void> {
  const data = parseBackup(json);
  const db = getDB();
  await db.transaction(
    'rw',
    [db.conversations, db.messages, db.settings, db.providers],
    async () => {
      if (data.conversations.length) await db.conversations.bulkPut(data.conversations);
      if (data.messages.length) await db.messages.bulkPut(data.messages);
      if (data.settings.length) await db.settings.bulkPut(data.settings);
      if (data.providers.length) {
        const providers = await Promise.all(data.providers.map(async (provider) => {
          if (provider.apiKey) return provider;
          const existing = await db.providers.get(provider.id);
          return { ...provider, apiKey: existing?.apiKey || '' };
        }));
        await db.providers.bulkPut(providers);
      }
    }
  );
}

export async function clearAllData(): Promise<void> {
  const db = getDB();
  await db.transaction(
    'rw',
    [db.conversations, db.messages, db.settings, db.providers],
    async () => {
      await Promise.all([
        db.conversations.clear(),
        db.messages.clear(),
        db.settings.clear(),
        db.providers.clear(),
      ]);
    }
  );
}

type BackupData = {
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings[];
  providers: ProviderConfig[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isConversation(value: unknown): value is Conversation {
  return isRecord(value)
    && isString(value.id)
    && isString(value.title)
    && isString(value.modelId)
    && isString(value.providerId)
    && isString(value.systemPrompt)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

function isMessage(value: unknown): value is Message {
  return isRecord(value)
    && isString(value.id)
    && isString(value.conversationId)
    && (value.role === 'user' || value.role === 'assistant')
    && isString(value.content)
    && (value.attachments === undefined
      || (Array.isArray(value.attachments) && value.attachments.every(isMessageAttachment)))
    && isTimestamp(value.createdAt);
}

function isMessageAttachment(value: unknown): value is MessageAttachment {
  return isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isString(value.mediaType)
    && typeof value.size === 'number'
    && Number.isSafeInteger(value.size)
    && value.size >= 0
    && isString(value.data);
}

function isSettings(value: unknown): value is AppSettings {
  return isRecord(value)
    && isString(value.id)
    && ['light', 'dark', 'system'].includes(String(value.theme))
    && isString(value.defaultProvider)
    && isString(value.defaultModel)
    && isString(value.defaultSystemPrompt)
    && typeof value.defaultTemperature === 'number'
    && Number.isFinite(value.defaultTemperature)
    && typeof value.maxTokens === 'number'
    && Number.isFinite(value.maxTokens)
    && value.maxTokens >= 1
    && value.maxTokens <= MAX_OUTPUT_TOKENS;
}

function isProvider(value: unknown): value is ProviderConfig {
  if (!isRecord(value)
    || !isString(value.id)
    || !isString(value.name)
    || !isString(value.baseURL)
    || !isString(value.apiKey)
    || !Array.isArray(value.models)) {
    return false;
  }

  return value.models.every((model) => isRecord(model)
    && isString(model.id)
    && isString(model.name)
    && typeof model.maxTokens === 'number'
    && Number.isFinite(model.maxTokens)
    && model.maxTokens >= 1
    && model.maxTokens <= MAX_OUTPUT_TOKENS);
}

function validatedArray<T>(
  value: unknown,
  label: string,
  validator: (item: unknown) => item is T
): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(validator)) {
    throw new Error(`备份中的${label}格式无效`);
  }
  return value;
}

function parseBackup(json: string): BackupData {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || value.version !== BACKUP_VERSION) {
    throw new Error('不支持的备份文件版本');
  }

  return {
    conversations: validatedArray(value.conversations, '对话', isConversation),
    messages: validatedArray(value.messages, '消息', isMessage),
    settings: validatedArray(value.settings, '设置', isSettings),
    providers: validatedArray(value.providers, '模型提供商', isProvider),
  };
}
