import { describe, expect, it } from 'vitest';
import { findLatestArtifactId } from './find-latest-artifact-id';

const artifacts = [
  {
    id: 'document-old',
    title: 'Report',
    type: 'document' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'spreadsheet-new',
    title: 'Report',
    type: 'spreadsheet' as const,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'spreadsheet-old',
    title: 'Report',
    type: 'spreadsheet' as const,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('findLatestArtifactId', () => {
  it('returns the newest artifact matching title and type', () => {
    expect(findLatestArtifactId(artifacts, 'Report', 'spreadsheet')).toBe(
      'spreadsheet-new',
    );
  });

  it('returns null when no artifact matches', () => {
    expect(
      findLatestArtifactId(artifacts, 'Missing', 'spreadsheet'),
    ).toBeNull();
  });
});
