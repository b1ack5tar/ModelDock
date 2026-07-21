// ============================================================
// POST /api/chat — SSE streaming proxy to LLM providers
// ============================================================

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { ChatRequestError, parseChatRequest } from '@/lib/chat-request';

const MAX_REQUEST_BYTES = 24 * 1024 * 1024;

function isCrossSiteRequest(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;

  const origin = request.headers.get('origin');
  return Boolean(origin && origin !== new URL(request.url).origin);
}

export async function POST(req: Request) {
  if (isCrossSiteRequest(req)) {
    return Response.json({ error: '不允许跨站请求' }, { status: 403 });
  }

  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: '请求体过大' }, { status: 413 });
  }

  try {
    const request = parseChatRequest(await req.json());
    const { providerConfig } = request;

    let model;

    if (providerConfig.id === 'anthropic') {
      const anthropic = createAnthropic({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL,
      });
      model = anthropic(request.modelId);
    } else {
      const openai = createOpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL,
      });
      model = openai.chat(request.modelId);
    }

    const result = streamText({
      model,
      messages: request.messages,
      ...(request.instructions ? { instructions: request.instructions } : {}),
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    if (err instanceof ChatRequestError || err instanceof SyntaxError) {
      const message = err instanceof ChatRequestError ? err.message : '请求 JSON 格式错误';
      return Response.json({ error: message }, { status: 400 });
    }

    console.error('ModelDock chat proxy error:', err);
    return Response.json({ error: '模型服务暂时不可用，请检查提供商配置后重试' }, { status: 502 });
  }
}
