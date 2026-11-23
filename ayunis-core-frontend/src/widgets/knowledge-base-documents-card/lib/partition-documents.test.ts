import { describe, expect, it } from 'vitest';
import type {
  KnowledgeBaseDocumentResponseDto,
  KnowledgeBaseDocumentResponseDtoStatus,
  SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';
import { partitionDocuments } from './partition-documents';

const doc = (
  id: string,
  syncedLocationId?: string,
  status: KnowledgeBaseDocumentResponseDtoStatus = 'ready',
) =>
  ({
    id,
    name: id,
    syncedLocationId,
    status,
  }) as KnowledgeBaseDocumentResponseDto;
const location = (id: string, documentCount = 0) =>
  ({ id, documentCount }) as SyncedLocationResponseDto;

describe('partitionDocuments', () => {
  it('lists a synced document only under its location, never also on its own', () => {
    const result = partitionDocuments(
      [
        doc('upload'),
        doc('synced-b', 'sharepoint'),
        doc('synced-a', 'sharepoint'),
      ],
      [location('sharepoint')],
    );

    expect(result.looseDocuments.map((d) => d.id)).toEqual(['upload']);
    expect(result.locations[0].files.map((d) => d.id)).toEqual([
      'synced-a',
      'synced-b',
    ]);
  });

  it('shows documents of a location that is not listed on their own, so none disappear', () => {
    const result = partitionDocuments([doc('synced', 'gone')], []);

    expect(result.looseDocuments.map((d) => d.id)).toEqual(['synced']);
  });

  it('counts the files whose processing has ended toward the progress', () => {
    const result = partitionDocuments(
      [
        doc('a', 'sharepoint', 'ready'),
        doc('b', 'sharepoint', 'failed'),
        doc('c', 'sharepoint', 'processing'),
      ],
      [location('sharepoint')],
    );

    expect(result.locations[0]).toMatchObject({ processed: 2 });
  });

  it('counts the documents a sync reported but the list does not have yet toward the progress total', () => {
    const result = partitionDocuments(
      [doc('a', 'sharepoint', 'ready')],
      [location('sharepoint', 300)],
    );

    expect(result.locations[0]).toMatchObject({ processed: 1, total: 300 });
  });
});
