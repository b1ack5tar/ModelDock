import { describe, expect, it } from 'vitest';
import { ChatRequestError, parseChatRequest } from './chat-request';

const baseRequest = {
  providerConfig: {
    id: 'openai',
    apiKey: 'test-key',
    baseURL: 'https://example.com/v1',
  },
  modelId: 'test-model',
};

describe('parseChatRequest attachments', () => {
  it('converts image attachments into model file parts', () => {
    const request = parseChatRequest({
      ...baseRequest,
      messages: [{
        role: 'user',
        content: '看看这张图',
        attachments: [{
          id: 'image-1',
          name: 'pixel.png',
          mediaType: 'image/png',
          size: 1,
          data: 'AA==',
        }],
      }],
    });

    expect(request.messages[0]).toMatchObject({
      role: 'user',
      content: [
        { type: 'text', text: '看看这张图' },
        {
          type: 'file',
          filename: 'pixel.png',
          mediaType: 'image/png',
          data: { type: 'data', data: 'AA==' },
        },
      ],
    });
  });

  it('rejects attachment data whose declared size does not match', () => {
    expect(() => parseChatRequest({
      ...baseRequest,
      messages: [{
        role: 'user',
        content: '',
        attachments: [{
          id: 'image-1',
          name: 'pixel.png',
          mediaType: 'image/png',
          size: 2,
          data: 'AA==',
        }],
      }],
    })).toThrow(ChatRequestError);
  });
});
