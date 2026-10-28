import { SourceDtoMapper } from './source.mapper';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';

const mapper = new SourceDtoMapper();

describe('source processing failure HTTP contract', () => {
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
  ])('returns the failure code without internal diagnostics: %s', (source) => {
    source.status = SourceStatus.FAILED;
    source.processingError = 'Private provider token and stack trace';
    source.processingErrorCode = Code.DOCUMENT_UNREADABLE;
    const dto = mapper.toDto(source);
    expect(dto.processingErrorCode).toBe(Code.DOCUMENT_UNREADABLE);
    expect(JSON.stringify(dto)).not.toMatch(/private|token|stack trace/i);
  });

  it('returns a generic code for legacy failures without interpreting their text', () => {
    const source = new FileSource({
      name: 'old.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.FAILED,
      processingError: 'The document could not be processed',
    });
    expect(mapper.toDto(source).processingErrorCode).toBe(
      Code.PROCESSING_FAILED,
    );
  });

  it('does not expose a stale failure code on a ready source', () => {
    const source = new FileSource({
      name: 'recovered.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.READY,
      processingError: 'Private',
      processingErrorCode: Code.DOCUMENT_UNREADABLE,
    });
    const dto = mapper.toDto(source);
    expect(dto.processingError).toBeUndefined();
    expect(dto.processingErrorCode).toBeUndefined();
  });
});
