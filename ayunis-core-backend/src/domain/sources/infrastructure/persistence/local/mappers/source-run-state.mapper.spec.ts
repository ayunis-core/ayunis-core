import { SourceMapper } from './source.mapper';
import type { SourceContentChunkMapper } from './source-content-chunk.mapper';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';

const mapper = new SourceMapper({
  toRecord: jest.fn(),
} as unknown as SourceContentChunkMapper);

const LAST_INDEXED_AT = new Date('2026-09-01T06:00:00.000Z');
const LAST_RUN_FAILED_AT = new Date('2026-09-15T06:00:00.000Z');

const runState = {
  lastIndexedAt: LAST_INDEXED_AT,
  lastRunFailedAt: LAST_RUN_FAILED_AT,
  lastRunError: 'getaddrinfo ENOTFOUND www.stadt.example',
  lastRunErrorCode: Code.PROCESSING_FAILED,
};

describe('source run state persistence mapping', () => {
  it.each([
    new FileSource({
      name: 'Haushaltssatzung.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      ...runState,
    }),
    new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      ...runState,
    }),
    new CSVDataSource({
      name: 'haushalt.csv',
      data: { headers: [], rows: [] },
      ...runState,
    }),
  ])('keeps the run state through a record roundtrip: %s', (source) => {
    const restored = mapper.toDomain(mapper.toRecord(source).source);

    expect(restored).toMatchObject(runState);
  });

  it('keeps the run state on the record written when content is replaced', () => {
    const source = new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      ...runState,
    });

    const { source: record } = mapper.toTextSourceRecord(source, {
      text: 'Restmüll: dienstags',
      chunks: [],
    });

    expect(record).toMatchObject(runState);
  });

  it('maps a source that never ran to empty run state', () => {
    const source = new FileSource({
      name: 'Haushaltssatzung.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    const restored = mapper.toDomain(mapper.toRecord(source).source);

    expect(restored).toMatchObject({
      lastIndexedAt: null,
      lastRunFailedAt: null,
      lastRunError: null,
      lastRunErrorCode: null,
    });
  });
});
