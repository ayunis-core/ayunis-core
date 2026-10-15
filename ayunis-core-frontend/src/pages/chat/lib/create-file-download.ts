import { resolvePiiTokens } from '@/widgets/markdown';

const MAX_FILENAME_LENGTH = 200;

const MIME_TYPES = {
  xml: 'application/xml',
  json: 'application/json',
  txt: 'text/plain',
} as const;

type FileFormat = keyof typeof MIME_TYPES;
export interface FileDownload {
  filename: string;
  format: FileFormat;
  content: string;
}

export function parseFileDownload(
  params: unknown,
  masks: ReadonlyMap<string, { value: string }>,
): FileDownload | null {
  if (typeof params !== 'object' || params === null) return null;
  const { filename, format, content } = params as Record<string, unknown>;
  if (
    typeof filename !== 'string' ||
    filename.length > MAX_FILENAME_LENGTH * 2 ||
    [...filename].length > MAX_FILENAME_LENGTH ||
    !isFileFormat(format) ||
    typeof content !== 'string' ||
    [...content].length > 100000
  )
    return null;
  return {
    filename: sanitizeFilename(resolvePiiTokens(filename, masks), format),
    format,
    content,
  };
}

function isFileFormat(format: unknown): format is FileFormat {
  return format === 'xml' || format === 'json' || format === 'txt';
}

function sanitizeFilename(filename: string, format: FileFormat): string {
  const cleaned = filename.replace(/[/\\:*?"<>|]/g, '').trim();
  const base = cleaned.replace(/(?:\.(?:xml|json|txt))+$/i, '');
  const boundedBase = [...base.trim()].slice(0, MAX_FILENAME_LENGTH).join('');
  return `${boundedBase || 'datei'}.${format}`;
}

export function downloadTextFile(file: FileDownload): void {
  const blob = new Blob([file.content], {
    type: `${MIME_TYPES[file.format]};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function resolveFileContent(
  file: FileDownload,
  masks: ReadonlyMap<string, { value: string }>,
): string {
  const escapedMasks = new Map(
    [...masks].map(([token, entry]) => [
      token,
      { value: escapeValue(entry.value, file.format) },
    ]),
  );
  return resolvePiiTokens(file.content, escapedMasks);
}

function escapeValue(value: string, format: FileFormat): string {
  if (format === 'json') return JSON.stringify(value).slice(1, -1);
  if (format === 'txt') return value;
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
