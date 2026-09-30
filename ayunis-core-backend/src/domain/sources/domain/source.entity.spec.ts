import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';

describe('Source run state', () => {
  it('records when new content went live and clears the previous run failure', () => {
    const source = new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      lastIndexedAt: new Date('2026-09-01T06:00:00.000Z'),
      lastRunFailedAt: new Date('2026-09-15T06:00:00.000Z'),
      lastRunError: 'getaddrinfo ENOTFOUND www.stadt.example',
      lastRunErrorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
    });
    const indexedAt = new Date('2026-09-29T06:00:00.000Z');

    source.recordIndexed(indexedAt);

    expect(source).toMatchObject({
      lastIndexedAt: indexedAt,
      lastRunFailedAt: null,
      lastRunError: null,
      lastRunErrorCode: null,
    });
  });
});
