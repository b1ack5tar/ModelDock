import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  it('uses the Clipboard API in a secure context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('window', { isSecureContext: true });

    await copyText('secure copy');

    expect(writeText).toHaveBeenCalledWith('secure copy');
  });

  it('falls back to a temporary selection on an insecure origin', async () => {
    const textarea = {
      value: '',
      readOnly: false,
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      remove: vi.fn(),
    };
    const activeElement = { focus: vi.fn() };
    const appendChild = vi.fn();
    const execCommand = vi.fn(() => true);

    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { isSecureContext: false });
    vi.stubGlobal('document', {
      activeElement,
      createElement: vi.fn(() => textarea),
      body: { appendChild },
      execCommand,
    });

    await copyText('mobile copy');

    expect(textarea.value).toBe('mobile copy');
    expect(appendChild).toHaveBeenCalledWith(textarea);
    expect(textarea.select).toHaveBeenCalled();
    expect(textarea.setSelectionRange).toHaveBeenCalledWith(0, 11);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(textarea.remove).toHaveBeenCalled();
  });
});
