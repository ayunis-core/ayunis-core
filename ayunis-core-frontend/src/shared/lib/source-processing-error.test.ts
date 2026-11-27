import { describe, expect, it } from 'vitest';
import { SourceProcessingErrorCode as Code } from '@ayunis/api-client/schemas';
import {
  getSourceProcessingErrorKey,
  getSourceProcessingErrorReason,
} from '@ayunis/chat/source-errors';

describe('getSourceProcessingErrorKey', () => {
  it.each([
    [Code.DOCUMENT_UNREADABLE, 'unreadable'],
    [Code.DOCUMENT_EMPTY, 'empty'],
    [Code.PROCESSING_TIMEOUT, 'timeout'],
    [Code.DOCUMENT_PAGE_LIMIT_EXCEEDED, 'tooManyPages'],
    [Code.RECORDING_TOO_LONG, 'recordingTooLong'],
    [Code.SPREADSHEET_TOO_LARGE, 'spreadsheetTooLarge'],
    [Code.PROCESSING_UNAVAILABLE, 'unavailable'],
    [Code.PROCESSING_FAILED, 'failed'],
    [undefined, 'failed'],
    ['FUTURE_CODE' as Code, 'failed'],
    ['__proto__' as Code, 'failed'],
    ['The document could not be processed' as Code, 'failed'],
  ])('maps %s to localized %s guidance', (code, reason) => {
    expect(getSourceProcessingErrorReason(code)).toBe(reason);
    expect(getSourceProcessingErrorKey(code)).toBe(
      `sources.processingErrors.${reason}`,
    );
  });
});
