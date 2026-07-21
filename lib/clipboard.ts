function copyWithSelection(text: string): void {
  const textarea = document.createElement('textarea');
  const activeElement = document.activeElement as HTMLElement | null;

  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto 0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  const copied = document.execCommand('copy');
  textarea.remove();
  activeElement?.focus({ preventScroll: true });

  if (!copied) throw new Error('浏览器拒绝了复制操作');
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a selection-based copy for restricted mobile browsers.
    }
  }

  copyWithSelection(text);
}
