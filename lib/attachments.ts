export const MAX_ATTACHMENT_COUNT = 4;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_ATTACHMENT_BYTES = 1024 * 1024;
export const MAX_ATTACHMENTS_TOTAL_BYTES = 8 * 1024 * 1024;

export const ATTACHMENT_ACCEPT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  '.md',
  '.txt',
  '.csv',
  '.json',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.html',
  '.css',
  '.xml',
  '.yaml',
  '.yml',
].join(',');

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const TEXT_TYPES = new Set([
  'application/json',
  'application/javascript',
  'application/xml',
  'application/yaml',
  'text/csv',
  'text/javascript',
  'text/markdown',
  'text/plain',
  'text/xml',
  'text/yaml',
]);
const TEXT_EXTENSIONS = new Set([
  'css', 'csv', 'html', 'js', 'json', 'jsx', 'md', 'py', 'ts', 'tsx', 'txt', 'xml', 'yaml', 'yml',
]);

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

export function normalizeAttachmentMediaType(name: string, mediaType: string): string | null {
  const normalizedType = mediaType.toLowerCase().split(';', 1)[0].trim();
  const extension = extensionOf(name);

  if (IMAGE_TYPES.has(normalizedType)) return normalizedType;
  if (normalizedType === 'application/pdf' || extension === 'pdf') return 'application/pdf';
  if (normalizedType.startsWith('text/') || TEXT_TYPES.has(normalizedType) || TEXT_EXTENSIONS.has(extension)) {
    return 'text/plain';
  }

  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return null;
}

export function isImageAttachment(mediaType: string): boolean {
  return IMAGE_TYPES.has(mediaType);
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
