import { SourceMapper } from './source.mapper';
import type { SourceContentChunkMapper } from './source-content-chunk.mapper';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';

const mapper = new SourceMapper({
  toRecord: jest.fn(),
} as unknown as SourceContentChunkMapper);

describe('source re-index schedule persistence mapping', () => {
  it('keeps the interval and next due date through a record roundtrip', () => {
    const nextReindexAt = new Date('2026-10-14T06:00:00.000Z');
    const source = new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      reindexInterval: new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
      nextReindexAt,
    });

    const record = mapper.toRecord(source).source;
    const restored = mapper.toDomain(record);

    expect(record).toMatchObject({
      reindexIntervalValue: 2,
      reindexIntervalUnit: ReindexIntervalUnit.WEEKS,
      nextReindexAt,
    });
    expect(restored.reindexInterval).toEqual(
      new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
    );
    expect(restored.nextReindexAt).toEqual(nextReindexAt);
  });

  it('maps an unscheduled source to null columns and back', () => {
    const source = new FileSource({
      name: 'Haushaltssatzung.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    const record = mapper.toRecord(source).source;
    const restored = mapper.toDomain(record);

    expect(record).toMatchObject({
      reindexIntervalValue: null,
      reindexIntervalUnit: null,
      nextReindexAt: null,
    });
    expect(restored).toMatchObject({
      reindexInterval: null,
      nextReindexAt: null,
    });
  });
});
