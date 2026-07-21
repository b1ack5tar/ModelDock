import { describe, expect, it } from 'vitest';
import { createRegenerationPlan } from './chat-utils';
import type { Message } from './types';

function message(id: string, role: Message['role'], content: string): Message {
  return {
    id,
    role,
    content,
    conversationId: 'conversation-1',
    createdAt: 1,
  };
}

describe('createRegenerationPlan', () => {
  it('replaces the latest user turn and everything after it', () => {
    const messages = [
      message('user-1', 'user', 'first question'),
      message('assistant-1', 'assistant', 'first answer'),
      message('user-2', 'user', 'second question'),
      message('assistant-2', 'assistant', 'second answer'),
    ];

    expect(createRegenerationPlan(messages)).toEqual({
      content: 'second question',
      messageIdsToReplace: ['user-2', 'assistant-2'],
      retainedMessages: messages.slice(0, 2),
    });
  });

  it('returns null when there is no user message', () => {
    expect(createRegenerationPlan([
      message('assistant-1', 'assistant', 'answer'),
    ])).toBeNull();
  });

  it('preserves attachments when regenerating', () => {
    const userMessage: Message = {
      ...message('user-1', 'user', ''),
      attachments: [{
        id: 'attachment-1',
        name: 'notes.txt',
        mediaType: 'text/plain',
        size: 5,
        data: 'aGVsbG8=',
      }],
    };

    expect(createRegenerationPlan([userMessage, message('assistant-1', 'assistant', 'answer')]))
      .toEqual({
        content: '',
        attachments: userMessage.attachments,
        messageIdsToReplace: ['user-1', 'assistant-1'],
        retainedMessages: [],
      });
  });
});
