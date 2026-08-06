import { describe, expect, it } from 'vitest';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { mergeSkillKnowledgeBases } from './merge-skill-knowledge-bases';

const makeKb = (
  overrides: Partial<KnowledgeBaseResponseDto> & { id: string; name: string },
): KnowledgeBaseResponseDto => ({
  description: 'Articles and guides from the help center',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-20T10:00:00.000Z',
  ...overrides,
});

describe('mergeSkillKnowledgeBases', () => {
  it('includes knowledge bases assigned to the skill that are not in the available list', () => {
    const available = [makeKb({ id: 'kb-1', name: 'Helpcenter' })];
    const assigned = [makeKb({ id: 'kb-2', name: 'Fee schedule' })];

    const result = mergeSkillKnowledgeBases(available, assigned);

    expect(result.map((kb) => kb.id)).toEqual(['kb-2', 'kb-1']);
  });

  it('deduplicates by id, preferring the available entry with its isShared flag', () => {
    const available = [
      makeKb({ id: 'kb-1', name: 'Helpcenter', isShared: true }),
    ];
    const assigned = [makeKb({ id: 'kb-1', name: 'Helpcenter' })];

    const result = mergeSkillKnowledgeBases(available, assigned);

    expect(result).toHaveLength(1);
    expect(result[0].isShared).toBe(true);
  });

  it('sorts the merged list by name', () => {
    const available = [
      makeKb({ id: 'kb-1', name: 'Zoning rules' }),
      makeKb({ id: 'kb-2', name: 'Building permits' }),
    ];
    const assigned = [makeKb({ id: 'kb-3', name: 'Fee schedule' })];

    const result = mergeSkillKnowledgeBases(available, assigned);

    expect(result.map((kb) => kb.name)).toEqual([
      'Building permits',
      'Fee schedule',
      'Zoning rules',
    ]);
  });

  it('returns an empty list when nothing is available or assigned', () => {
    expect(mergeSkillKnowledgeBases([], [])).toEqual([]);
  });
});
