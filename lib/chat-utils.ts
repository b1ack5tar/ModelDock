import type { Message, MessageAttachment } from './types';

export interface RegenerationPlan {
  content: string;
  attachments?: MessageAttachment[];
  messageIdsToReplace: string[];
  retainedMessages: Message[];
}

export function createRegenerationPlan(messages: Message[]): RegenerationPlan | null {
  const lastUserIndex = messages.findLastIndex((message) => message.role === 'user');
  if (lastUserIndex < 0) return null;

  const userMessage = messages[lastUserIndex];
  return {
    content: userMessage.content,
    ...(userMessage.attachments?.length ? { attachments: userMessage.attachments } : {}),
    messageIdsToReplace: messages.slice(lastUserIndex).map((message) => message.id),
    retainedMessages: messages.slice(0, lastUserIndex),
  };
}
