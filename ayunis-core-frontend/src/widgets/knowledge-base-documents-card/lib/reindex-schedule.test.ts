import { describe, expect, it } from 'vitest';
import type { KnowledgeBaseDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  canScheduleReindex,
  DEFAULT_REINDEX_INTERVAL_FIELDS,
  hasFailedSinceLastIndex,
  toReindexIntervalDto,
  toReindexIntervalFields,
} from './reindex-schedule';

function webSource(
  overrides: Partial<KnowledgeBaseDocumentResponseDto> = {},
): KnowledgeBaseDocumentResponseDto {
  return {
    id: 'waste-calendar',
    name: 'Abfallkalender',
    type: 'text',
    createdBy: 'user',
    createdAt: '2026-09-01T06:00:00.000Z',
    updatedAt: '2026-09-25T06:00:00.000Z',
    status: 'ready',
    textType: 'web',
    url: 'https://www.stadt.example/abfall',
    reindexInterval: null,
    nextReindexAt: null,
    lastIndexedAt: '2026-09-25T06:00:00.000Z',
    lastRunFailedAt: null,
    lastRunErrorCode: null,
    ...overrides,
  };
}

describe(hasFailedSinceLastIndex.name, () => {
  it('is false for a source whose runs all succeeded', () => {
    expect(hasFailedSinceLastIndex(webSource())).toBe(false);
  });

  it('is true while the last run failed after the last successful index', () => {
    expect(
      hasFailedSinceLastIndex(
        webSource({
          lastRunFailedAt: '2026-09-30T06:00:00.000Z',
          lastRunErrorCode: 'CONTENT_DEGRADED',
        }),
      ),
    ).toBe(true);
  });

  it('is false once a later successful index is reflected', () => {
    expect(
      hasFailedSinceLastIndex(
        webSource({
          lastRunFailedAt: '2026-09-30T06:00:00.000Z',
          lastIndexedAt: '2026-10-14T06:00:00.000Z',
        }),
      ),
    ).toBe(false);
  });

  it('is true for a failed run of a source that was never indexed', () => {
    expect(
      hasFailedSinceLastIndex(
        webSource({
          lastIndexedAt: null,
          lastRunFailedAt: '2026-09-30T06:00:00.000Z',
        }),
      ),
    ).toBe(true);
  });
});

describe(canScheduleReindex.name, () => {
  it('allows a ready web source', () => {
    expect(canScheduleReindex(webSource())).toBe(true);
  });

  it.each(['processing', 'failed'] as const)(
    'does not allow a %s web source',
    (status) => {
      expect(canScheduleReindex(webSource({ status }))).toBe(false);
    },
  );

  it('does not allow an uploaded file', () => {
    expect(
      canScheduleReindex(webSource({ textType: 'file', url: undefined })),
    ).toBe(false);
  });
});

describe('re-index interval form mapping', () => {
  it('defaults to no automatic re-indexing', () => {
    expect(toReindexIntervalFields(null)).toEqual(
      DEFAULT_REINDEX_INTERVAL_FIELDS,
    );
    expect(DEFAULT_REINDEX_INTERVAL_FIELDS.enabled).toBe(false);
    expect(toReindexIntervalDto(DEFAULT_REINDEX_INTERVAL_FIELDS)).toBeNull();
  });

  it('round-trips a stored interval', () => {
    const interval = { value: 6, unit: 'months' as const };

    expect(toReindexIntervalDto(toReindexIntervalFields(interval))).toEqual(
      interval,
    );
  });

  it('sends a numeric value even when the input produced a string', () => {
    expect(
      toReindexIntervalDto({
        enabled: true,
        value: '3' as unknown as number,
        unit: 'weeks',
      }),
    ).toEqual({ value: 3, unit: 'weeks' });
  });
});
