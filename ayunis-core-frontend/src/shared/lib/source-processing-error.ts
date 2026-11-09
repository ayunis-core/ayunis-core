import { SourceProcessingErrorCode as Code } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type SourceProcessingErrorReason =
  | 'unreadable'
  | 'empty'
  | 'tooManyPages'
  | 'recordingTooLong'
  | 'timeout'
  | 'unavailable'
  | 'failed';

const REASONS: Record<Code, SourceProcessingErrorReason> = {
  [Code.DOCUMENT_UNREADABLE]: 'unreadable',
  [Code.DOCUMENT_EMPTY]: 'empty',
  [Code.DOCUMENT_PAGE_LIMIT_EXCEEDED]: 'tooManyPages',
  [Code.RECORDING_TOO_LONG]: 'recordingTooLong',
  [Code.PROCESSING_TIMEOUT]: 'timeout',
  [Code.PROCESSING_UNAVAILABLE]: 'unavailable',
  [Code.PROCESSING_FAILED]: 'failed',
};

/**
 * Translation-key suffix for a processing failure. Each surface owns its
 * wording (`sources.processingErrors.*` in `common` for chat,
 * `detail.documents.processingErrors.*` in `knowledge-bases`), so unknown or
 * missing codes fall back to the generic reason instead of leaking the
 * backend's English message.
 */
export function getSourceProcessingErrorReason(
  code?: Code,
): SourceProcessingErrorReason {
  return code && Object.hasOwn(REASONS, code) ? REASONS[code] : 'failed';
}

export function getSourceProcessingErrorKey(code?: Code): string {
  return `sources.processingErrors.${getSourceProcessingErrorReason(code)}`;
}
