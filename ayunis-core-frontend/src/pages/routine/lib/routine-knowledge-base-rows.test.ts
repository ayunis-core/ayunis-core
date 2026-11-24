import { describe, expect, it } from 'vitest';
import type { KnowledgeBaseResponseDto } from '@ayunis/api-client/schemas';
import { routineKnowledgeBaseRows } from './routine-knowledge-base-rows';

const knowledgeBase = (id: string, name: string) =>
  ({ id, name }) as KnowledgeBaseResponseDto;

describe('routineKnowledgeBaseRows', () => {
  it("keeps a linked knowledge base the user's list does not include, so it can be switched off", () => {
    const statutes = knowledgeBase('kb-1', 'Satzungen');
    const minutes = knowledgeBase('kb-2', 'Protokolle');

    expect(
      routineKnowledgeBaseRows([statutes], [minutes, statutes]).map(
        ({ id }) => id,
      ),
    ).toEqual(['kb-2', 'kb-1']);
  });
});
