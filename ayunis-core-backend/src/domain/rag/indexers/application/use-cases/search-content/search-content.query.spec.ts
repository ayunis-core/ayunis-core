import type { UUID } from 'crypto';
import {
  SearchMultiContentQuery,
  SearchContentQuery,
} from './search-content.query';
import { IndexType } from '../../../domain/value-objects/index-type.enum';

describe('SearchMultiContentQuery', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const docId1 = '22222222-2222-2222-2222-222222222222' as UUID;
  const docId2 = '33333333-3333-3333-3333-333333333333' as UUID;

  it('should construct with all required fields', () => {
    const query = new SearchMultiContentQuery({
      orgId,
      query: 'Wie hoch ist die Grundsteuer?',
      documentIds: [docId1, docId2],
      type: IndexType.PARENT_CHILD,
    });

    expect(query.orgId).toBe(orgId);
    expect(query.query).toBe('Wie hoch ist die Grundsteuer?');
    expect(query.documentIds).toEqual([docId1, docId2]);
    expect(query.type).toBe(IndexType.PARENT_CHILD);
    expect(query.limit).toBeUndefined();
  });

  it('should accept an optional limit', () => {
    const query = new SearchMultiContentQuery({
      orgId,
      query: 'Bauordnung',
      documentIds: [docId1],
      type: IndexType.PARENT_CHILD,
      limit: 25,
    });

    expect(query.limit).toBe(25);
  });

  it('should accept an empty documentIds array', () => {
    const query = new SearchMultiContentQuery({
      orgId,
      query: 'Haushaltssatzung',
      documentIds: [],
      type: IndexType.PARENT_CHILD,
    });

    expect(query.documentIds).toEqual([]);
  });
});

describe('SearchContentQuery', () => {
  it('should construct with all required fields', () => {
    const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
    const docId = '22222222-2222-2222-2222-222222222222' as UUID;

    const query = new SearchContentQuery({
      orgId,
      query: 'Abfallgebühren',
      documentId: docId,
      type: IndexType.PARENT_CHILD,
    });

    expect(query.orgId).toBe(orgId);
    expect(query.documentId).toBe(docId);
    expect(query.query).toBe('Abfallgebühren');
    expect(query.type).toBe(IndexType.PARENT_CHILD);
  });
});
