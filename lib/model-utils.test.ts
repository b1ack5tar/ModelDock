import { describe, expect, it } from 'vitest';
import { isBuiltInProvider, MAX_OUTPUT_TOKENS } from './constants';
import { getEffectiveMaxTokens, normalizeMaxTokens } from './model-utils';
import type { ProviderConfig } from './types';

const provider: ProviderConfig = {
  id: 'custom-provider',
  name: 'Custom Provider',
  baseURL: 'https://example.com/v1',
  apiKey: '',
  models: [
    { id: 'small-model', name: 'Small Model', maxTokens: 2_048 },
  ],
};

describe('getEffectiveMaxTokens', () => {
  it('uses the requested value when it is below the model limit', () => {
    expect(getEffectiveMaxTokens(provider, 'small-model', 1_024)).toBe(1_024);
  });

  it('caps the requested value at the selected model limit', () => {
    expect(getEffectiveMaxTokens(provider, 'small-model', 4_096)).toBe(2_048);
  });

  it('uses the normalized requested value for an unknown model', () => {
    expect(getEffectiveMaxTokens(provider, 'unknown-model', MAX_OUTPUT_TOKENS + 1)).toBe(
      MAX_OUTPUT_TOKENS
    );
  });
});

describe('normalizeMaxTokens', () => {
  it('keeps token limits inside the supported range', () => {
    expect(normalizeMaxTokens(0)).toBe(1);
    expect(normalizeMaxTokens(1_024.9)).toBe(1_024);
    expect(normalizeMaxTokens(Number.NaN, 2_048)).toBe(2_048);
  });
});

describe('isBuiltInProvider', () => {
  it('protects built-in providers while allowing custom providers', () => {
    expect(isBuiltInProvider('deepseek')).toBe(true);
    expect(isBuiltInProvider('openai')).toBe(true);
    expect(isBuiltInProvider('anthropic')).toBe(true);
    expect(isBuiltInProvider('custom-provider')).toBe(false);
  });
});
