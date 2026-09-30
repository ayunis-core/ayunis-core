import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';

function wasteCalendar(lastIndexedAt: Date | null): UrlSource {
  return new UrlSource({
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    lastIndexedAt,
  });
}

describe('Source re-index schedule', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');
  const everyTwoWeeks = new ReindexInterval(2, ReindexIntervalUnit.WEEKS);

  it('is unscheduled by default', () => {
    expect(wasteCalendar(null)).toMatchObject({
      reindexInterval: null,
      nextReindexAt: null,
    });
  });

  it('is next due one interval after the last successful index', () => {
    const source = wasteCalendar(new Date('2026-09-25T06:00:00.000Z'));

    source.scheduleReindex(everyTwoWeeks, now);

    expect(source.reindexInterval).toBe(everyTwoWeeks);
    expect(source.nextReindexAt).toEqual(new Date('2026-10-09T06:00:00.000Z'));
  });

  it('is next due one interval from now when the source was never indexed', () => {
    const source = wasteCalendar(null);

    source.scheduleReindex(everyTwoWeeks, now);

    expect(source.nextReindexAt).toEqual(new Date('2026-10-14T12:00:00.000Z'));
  });

  it('keeps a due date that has already passed, so the next sweep picks it up', () => {
    const source = wasteCalendar(new Date('2026-06-01T06:00:00.000Z'));

    source.scheduleReindex(everyTwoWeeks, now);

    expect(source.nextReindexAt).toEqual(new Date('2026-06-15T06:00:00.000Z'));
  });

  it('recomputes the due date from the last index when the interval changes', () => {
    const source = wasteCalendar(new Date('2026-09-25T06:00:00.000Z'));
    source.scheduleReindex(everyTwoWeeks, now);

    source.scheduleReindex(
      new ReindexInterval(1, ReindexIntervalUnit.MONTHS),
      now,
    );

    expect(source.nextReindexAt).toEqual(new Date('2026-10-25T06:00:00.000Z'));
  });

  it('stops automatic re-indexing when the schedule is cleared', () => {
    const source = wasteCalendar(new Date('2026-09-25T06:00:00.000Z'));
    source.scheduleReindex(everyTwoWeeks, now);

    source.scheduleReindex(null, now);

    expect(source).toMatchObject({
      reindexInterval: null,
      nextReindexAt: null,
    });
  });
});

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
