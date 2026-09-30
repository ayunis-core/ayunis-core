import { SourceMapper } from './source.mapper';
import type { SourceContentChunkMapper } from './source-content-chunk.mapper';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';

const mapper = new SourceMapper({} as SourceContentChunkMapper);

describe('source failure persistence mapping', () => {
  it.each([
    new FileSource({
      name: 'invoice.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
    }),
    new UrlSource({
      name: 'Municipal website',
      type: TextType.WEB,
      url: 'https://example.org',
    }),
    new CSVDataSource({
      name: 'invoices.csv',
      data: { headers: [], rows: [] },
    }),
  ])('preserves structured errors through a record roundtrip: %s', (source) => {
    source.status = SourceStatus.FAILED;
    source.processingError = 'Private diagnostic';
    source.processingErrorCode = Code.DOCUMENT_PAGE_LIMIT_EXCEEDED;
    const record = mapper.toRecord(source).source;
    const restored = mapper.toDomain(record);
    expect(restored.status).toBe(SourceStatus.FAILED);
    expect(restored.processingErrorCode).toBe(
      Code.DOCUMENT_PAGE_LIMIT_EXCEEDED,
    );
    expect(restored.processingError).toBe('Private diagnostic');
  });

  it('keeps legacy failures without inventing a specific reason', () => {
    const source = new FileSource({
      name: 'old.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.FAILED,
      processingError: 'The document could not be processed',
    });
    const restored = mapper.toDomain(mapper.toRecord(source).source);
    expect(restored.processingErrorCode).toBeNull();
  });
});
