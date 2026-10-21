import { DocumentExtractionResultInvalidError } from 'src/domain/sources/application/sources.errors';
import {
  joinExtractionPages,
  parseExtractionResult,
} from './extraction-result.helper';

function result(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    jobId: '01J',
    idempotencyKey: 'v1:source:hash',
    document: { fileName: 'report.pdf', pageCount: 2 },
    pages: [
      {
        index: 1,
        number: 2,
        text: 'second',
        method: 'ocr',
        ocrReason: 'no_text',
      },
      { index: 0, number: 1, text: 'first\0', method: 'text', ocrReason: null },
    ],
    ...overrides,
  });
}

describe('parseExtractionResult', () => {
  it('orders pages by index and strips NUL bytes', () => {
    const parsed = parseExtractionResult(Buffer.from(result()));

    expect(parsed.pages.map((page) => page.text)).toEqual(['first', 'second']);
    expect(joinExtractionPages(parsed.pages)).toBe('first\nsecond');
  });

  it.each([
    ['not JSON', 'not valid JSON'],
    [result({ schemaVersion: 2 }), 'unsupported schemaVersion 2'],
    [result({ pages: 'none' }), 'pages or document missing'],
    [result({ pages: [{ number: 1 }] }), 'page 0 lacks index or text'],
  ])('rejects %s as an invalid result', (raw, reason) => {
    expect(() => parseExtractionResult(raw)).toThrow(
      new DocumentExtractionResultInvalidError(reason),
    );
  });
});
