import type { UUID } from 'crypto';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { mergeKnowledgeBases } from './merge-knowledge-bases';

describe('mergeKnowledgeBases', () => {
  it('deduplicates thread, workspace, and active knowledge bases by id', () => {
    const sharedId = '11111111-1111-1111-1111-111111111111' as UUID;
    const threadVersion: KnowledgeBaseSummary = {
      id: sharedId,
      name: 'Thread regulations',
    };
    const activeVersion: KnowledgeBaseSummary = {
      id: sharedId,
      name: 'Active regulations',
    };
    const workspaceKnowledgeBase: KnowledgeBaseSummary = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Workspace handbook',
    };

    expect(
      mergeKnowledgeBases(
        [threadVersion],
        [workspaceKnowledgeBase],
        [activeVersion],
      ),
    ).toEqual([threadVersion, workspaceKnowledgeBase]);
  });
});
