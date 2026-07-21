import type { FilePart, ModelMessage, TextPart } from 'ai';
import { MAX_OUTPUT_TOKENS } from './constants';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENTS_TOTAL_BYTES,
  MAX_TEXT_ATTACHMENT_BYTES,
  normalizeAttachmentMediaType,
} from './attachments';

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 100_000;
const MAX_TOTAL_CONTENT_LENGTH = 1_000_000;
const MAX_API_KEY_LENGTH = 16_384;
const MAX_MODEL_ID_LENGTH = 256;
const MAX_ATTACHMENT_NAME_LENGTH = 512;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

type ValidatedAttachment = {
  name: string;
  mediaType: string;
  data: string;
  size: number;
};

type ProviderRequestConfig = {
  id: string;
  apiKey: string;
  baseURL: string;
};

export type ValidatedChatRequest = {
  providerConfig: ProviderRequestConfig;
  modelId: string;
  instructions?: string;
  messages: ModelMessage[];
  temperature: number;
  maxOutputTokens: number;
};

export class ChatRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatRequestError';
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ChatRequestError(`${label}格式错误`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ChatRequestError(`${label}未配置`);
  }
  if (value.length > maxLength) {
    throw new ChatRequestError(`${label}过长`);
  }
  return value.trim();
}

function validateBaseURL(value: unknown): string {
  const baseURL = requiredString(value, 'Base URL', 2_048);
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new ChatRequestError('Base URL 格式错误');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ChatRequestError('Base URL 必须是有效的 HTTP(S) 地址');
  }
  return url.toString().replace(/\/$/, '');
}

function validateMessages(value: unknown): {
  instructions?: string;
  messages: ModelMessage[];
} {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    throw new ChatRequestError('消息数量无效');
  }

  let totalLength = 0;
  const systemMessages: string[] = [];
  const messages: ModelMessage[] = [];

  for (const rawMessage of value) {
    const message = asRecord(rawMessage, '消息');
    const role = message.role;
    const content = message.content;
    const attachments = validateAttachments(message.attachments);

    if (!['system', 'user', 'assistant'].includes(String(role))) {
      throw new ChatRequestError('消息角色无效');
    }
    if (typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) {
      throw new ChatRequestError('消息内容无效或过长');
    }
    if (attachments.length > 0 && role !== 'user') {
      throw new ChatRequestError('只有用户消息可以包含附件');
    }

    totalLength += content.length;
    if (totalLength > MAX_TOTAL_CONTENT_LENGTH) {
      throw new ChatRequestError('消息总长度超出限制');
    }

    if (role === 'system') {
      if (content.trim()) systemMessages.push(content);
    } else if (role === 'user') {
      const parts: Array<TextPart | FilePart> = [];
      if (content) parts.push({ type: 'text', text: content });

      for (const attachment of attachments) {
        if (attachment.mediaType === 'text/plain') {
          const text = Buffer.from(attachment.data, 'base64').toString('utf8');
          totalLength += text.length;
          if (totalLength > MAX_TOTAL_CONTENT_LENGTH) {
            throw new ChatRequestError('消息总长度超出限制');
          }
          parts.push({
            type: 'text',
            text: `\n\n--- 附件：${attachment.name} ---\n${text}\n--- 附件结束 ---`,
          });
        } else {
          parts.push({
            type: 'file',
            data: { type: 'data', data: attachment.data },
            filename: attachment.name,
            mediaType: attachment.mediaType,
          });
        }
      }

      if (parts.length === 0) {
        throw new ChatRequestError('用户消息不能为空');
      }
      messages.push({ role: 'user', content: parts });
    } else {
      messages.push({ role: 'assistant', content });
    }
  }

  if (messages.length === 0) {
    throw new ChatRequestError('至少需要一条对话消息');
  }

  return {
    ...(systemMessages.length ? { instructions: systemMessages.join('\n\n') } : {}),
    messages,
  };
}

function validateAttachments(value: unknown): ValidatedAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENT_COUNT) {
    throw new ChatRequestError(`每条消息最多包含 ${MAX_ATTACHMENT_COUNT} 个附件`);
  }

  let totalBytes = 0;
  return value.map((rawAttachment) => {
    const attachment = asRecord(rawAttachment, '附件');
    const name = requiredString(attachment.name, '附件名称', MAX_ATTACHMENT_NAME_LENGTH);
    const rawMediaType = requiredString(attachment.mediaType, '附件类型', 100);
    const mediaType = normalizeAttachmentMediaType(name, rawMediaType);
    const data = attachment.data;
    const size = attachment.size;

    if (!mediaType || typeof data !== 'string' || !BASE64_PATTERN.test(data)) {
      throw new ChatRequestError(`附件 ${name} 的格式无效`);
    }
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0) {
      throw new ChatRequestError(`附件 ${name} 的大小无效`);
    }

    const actualBytes = Buffer.from(data, 'base64').byteLength;
    if (actualBytes !== size || actualBytes > MAX_ATTACHMENT_BYTES) {
      throw new ChatRequestError(`附件 ${name} 的大小无效或超出限制`);
    }
    if (mediaType === 'text/plain' && actualBytes > MAX_TEXT_ATTACHMENT_BYTES) {
      throw new ChatRequestError(`文本附件 ${name} 超出大小限制`);
    }

    totalBytes += actualBytes;
    if (totalBytes > MAX_ATTACHMENTS_TOTAL_BYTES) {
      throw new ChatRequestError('附件总大小超出限制');
    }

    return { name, mediaType, data, size: actualBytes };
  });
}

function optionalNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  label: string
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ChatRequestError(`${label}超出有效范围`);
  }
  return value;
}

export function parseChatRequest(value: unknown): ValidatedChatRequest {
  const body = asRecord(value, '请求');
  const provider = asRecord(body.providerConfig, '模型提供商');
  const apiKey = requiredString(provider.apiKey, 'API Key', MAX_API_KEY_LENGTH);
  const id = requiredString(provider.id, '模型提供商', 100);
  const baseURL = validateBaseURL(provider.baseURL);

  let fallbackModelId: unknown;
  if (Array.isArray(provider.models) && provider.models.length > 0) {
    fallbackModelId = asRecord(provider.models[0], '模型').id;
  }
  const modelId = requiredString(body.modelId ?? fallbackModelId, '模型', MAX_MODEL_ID_LENGTH);
  const messageData = validateMessages(body.messages);

  return {
    providerConfig: { id, apiKey, baseURL },
    modelId,
    ...messageData,
    temperature: optionalNumber(body.temperature, 0.7, 0, 2, 'Temperature'),
    maxOutputTokens: Math.floor(
      optionalNumber(body.maxTokens, 4_096, 1, MAX_OUTPUT_TOKENS, '最大输出 Token')
    ),
  };
}
