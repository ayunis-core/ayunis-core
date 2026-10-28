import { SourceProcessingErrorCode as Code } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const ERROR_KEYS: Record<Code, string> = {
  [Code.DOCUMENT_UNREADABLE]: 'sources.processingErrors.unreadable',
  [Code.DOCUMENT_EMPTY]: 'sources.processingErrors.empty',
  [Code.DOCUMENT_PAGE_LIMIT_EXCEEDED]: 'sources.processingErrors.tooManyPages',
  [Code.PROCESSING_TIMEOUT]: 'sources.processingErrors.timeout',
  [Code.PROCESSING_UNAVAILABLE]: 'sources.processingErrors.unavailable',
  [Code.PROCESSING_FAILED]: 'sources.processingErrors.failed',
};

export function getSourceProcessingErrorKey(code?: Code): string {
  return code && Object.hasOwn(ERROR_KEYS, code)
    ? ERROR_KEYS[code]
    : ERROR_KEYS[Code.PROCESSING_FAILED];
}
