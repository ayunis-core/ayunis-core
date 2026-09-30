import type { UUID } from 'crypto';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  SourceNotFoundError,
  SourceReindexNotSupportedError,
} from 'src/domain/sources/application/sources.errors';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { SetSourceReindexScheduleCommand } from './set-source-reindex-schedule.command';
import { SetSourceReindexScheduleUseCase } from './set-source-reindex-schedule.use-case';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const KNOWLEDGE_BASE_ID = '00000000-0000-0000-0000-000000000030' as UUID;
const LAST_INDEXED_AT = new Date('2026-09-25T06:00:00.000Z');
const EVERY_TWO_WEEKS = new ReindexInterval(2, ReindexIntervalUnit.WEEKS);

function wasteCalendar(
  overrides: Partial<ConstructorParameters<typeof UrlSource>[0]> = {},
): UrlSource {
  return new UrlSource({
    id: SOURCE_ID,
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    lastIndexedAt: LAST_INDEXED_AT,
    ...overrides,
  });
}

describe('SetSourceReindexScheduleUseCase', () => {
  let sourceRepository: jest.Mocked<SourceRepository>;
  let useCase: SetSourceReindexScheduleUseCase;

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    useCase = new SetSourceReindexScheduleUseCase(sourceRepository);
  });

  it('schedules the next run one interval after the last index and writes only the schedule', async () => {
    sourceRepository.findById.mockResolvedValue(wasteCalendar());

    const source = await useCase.execute(
      new SetSourceReindexScheduleCommand({
        sourceId: SOURCE_ID,
        interval: EVERY_TWO_WEEKS,
      }),
    );

    const schedule = {
      interval: EVERY_TWO_WEEKS,
      nextReindexAt: new Date('2026-10-09T06:00:00.000Z'),
    };
    expect(sourceRepository.updateReindexSchedule).toHaveBeenCalledWith(
      SOURCE_ID,
      schedule,
    );
    expect(sourceRepository.save).not.toHaveBeenCalled();
    expect(source).toMatchObject({
      reindexInterval: schedule.interval,
      nextReindexAt: schedule.nextReindexAt,
    });
  });

  it('recomputes the next run when the interval changes', async () => {
    sourceRepository.findById.mockResolvedValue(
      wasteCalendar({
        reindexInterval: EVERY_TWO_WEEKS,
        nextReindexAt: new Date('2026-10-09T06:00:00.000Z'),
      }),
    );

    await useCase.execute(
      new SetSourceReindexScheduleCommand({
        sourceId: SOURCE_ID,
        interval: new ReindexInterval(6, ReindexIntervalUnit.MONTHS),
      }),
    );

    expect(sourceRepository.updateReindexSchedule).toHaveBeenCalledWith(
      SOURCE_ID,
      {
        interval: new ReindexInterval(6, ReindexIntervalUnit.MONTHS),
        nextReindexAt: new Date('2027-03-25T06:00:00.000Z'),
      },
    );
  });

  it('clears the schedule', async () => {
    sourceRepository.findById.mockResolvedValue(
      wasteCalendar({
        reindexInterval: EVERY_TWO_WEEKS,
        nextReindexAt: new Date('2026-10-09T06:00:00.000Z'),
      }),
    );

    await useCase.execute(
      new SetSourceReindexScheduleCommand({
        sourceId: SOURCE_ID,
        interval: null,
      }),
    );

    expect(sourceRepository.updateReindexSchedule).toHaveBeenCalledWith(
      SOURCE_ID,
      { interval: null, nextReindexAt: null },
    );
  });

  it('rejects a source that does not exist', async () => {
    await expect(
      useCase.execute(
        new SetSourceReindexScheduleCommand({
          sourceId: SOURCE_ID,
          interval: EVERY_TWO_WEEKS,
        }),
      ),
    ).rejects.toThrow(SourceNotFoundError);
    expect(sourceRepository.updateReindexSchedule).not.toHaveBeenCalled();
  });

  it('rejects a source deleted before its schedule is written', async () => {
    sourceRepository.findById.mockResolvedValue(wasteCalendar());
    sourceRepository.updateReindexSchedule.mockResolvedValue(false);

    await expect(
      useCase.execute(
        new SetSourceReindexScheduleCommand({
          sourceId: SOURCE_ID,
          interval: EVERY_TWO_WEEKS,
        }),
      ),
    ).rejects.toThrow(SourceNotFoundError);
  });

  it('rejects a file source, which cannot be fetched again', async () => {
    sourceRepository.findById.mockResolvedValue(
      new FileSource({
        id: SOURCE_ID,
        name: 'Haushaltssatzung.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
      }),
    );

    await expect(
      useCase.execute(
        new SetSourceReindexScheduleCommand({
          sourceId: SOURCE_ID,
          interval: EVERY_TWO_WEEKS,
        }),
      ),
    ).rejects.toThrow(SourceReindexNotSupportedError);
    expect(sourceRepository.updateReindexSchedule).not.toHaveBeenCalled();
  });

  it('rejects scheduling a source outside a knowledge base, whose org the scheduler cannot tell', async () => {
    sourceRepository.findById.mockResolvedValue(
      wasteCalendar({ knowledgeBaseId: null }),
    );

    await expect(
      useCase.execute(
        new SetSourceReindexScheduleCommand({
          sourceId: SOURCE_ID,
          interval: EVERY_TWO_WEEKS,
        }),
      ),
    ).rejects.toThrow(SourceReindexNotSupportedError);
    expect(sourceRepository.updateReindexSchedule).not.toHaveBeenCalled();
  });
});
