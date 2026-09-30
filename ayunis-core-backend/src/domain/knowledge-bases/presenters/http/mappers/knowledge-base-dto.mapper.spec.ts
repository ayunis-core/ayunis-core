import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { KnowledgeBaseDtoMapper } from './knowledge-base-dto.mapper';

const mapper = new KnowledgeBaseDtoMapper();

describe(`${KnowledgeBaseDtoMapper.name}.toDocumentDto`, () => {
  it('exposes the schedule and the last run of a scheduled web source whose last run failed', () => {
    const source = new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      status: SourceStatus.READY,
      reindexInterval: new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
      nextReindexAt: new Date('2026-10-09T06:00:00.000Z'),
      lastIndexedAt: new Date('2026-09-25T06:00:00.000Z'),
      lastRunFailedAt: new Date('2026-09-30T06:00:00.000Z'),
      lastRunError: 'fetch failed: ECONNREFUSED 10.0.0.12:443',
      lastRunErrorCode: SourceProcessingErrorCode.CONTENT_DEGRADED,
    });

    const dto = mapper.toDocumentDto(source);

    expect(dto).toMatchObject({
      reindexInterval: { value: 2, unit: 'weeks' },
      nextReindexAt: '2026-10-09T06:00:00.000Z',
      lastIndexedAt: '2026-09-25T06:00:00.000Z',
      lastRunFailedAt: '2026-09-30T06:00:00.000Z',
      lastRunErrorCode: 'CONTENT_DEGRADED',
    });
  });

  it('never exposes the raw run error message', () => {
    const source = new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      lastRunFailedAt: new Date('2026-09-30T06:00:00.000Z'),
      lastRunError: 'fetch failed: ECONNREFUSED 10.0.0.12:443',
      lastRunErrorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
    });

    expect(JSON.stringify(mapper.toDocumentDto(source))).not.toContain(
      'ECONNREFUSED',
    );
  });

  it('returns explicit nulls for an unscheduled file source that never ran', () => {
    const source = new FileSource({
      name: 'Haushaltssatzung_2026.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.PROCESSING,
    });

    expect(mapper.toDocumentDto(source)).toMatchObject({
      reindexInterval: null,
      nextReindexAt: null,
      lastIndexedAt: null,
      lastRunFailedAt: null,
      lastRunErrorCode: null,
    });
  });
});
