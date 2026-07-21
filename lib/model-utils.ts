import { MAX_OUTPUT_TOKENS } from './constants';
import type { ProviderConfig } from './types';

export function normalizeMaxTokens(value: number, fallback = 4_096): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(1, Math.floor(value)));
}

export function getEffectiveMaxTokens(
  provider: ProviderConfig,
  modelId: string,
  requestedTokens: number
): number {
  const requested = normalizeMaxTokens(requestedTokens);
  const model = provider.models.find(({ id }) => id === modelId);

  if (!model || !Number.isFinite(model.maxTokens) || model.maxTokens < 1) {
    return requested;
  }

  return Math.min(requested, normalizeMaxTokens(model.maxTokens));
}
