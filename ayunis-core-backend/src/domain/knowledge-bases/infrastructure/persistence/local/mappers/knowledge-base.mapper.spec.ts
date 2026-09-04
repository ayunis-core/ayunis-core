import { randomUUID } from 'crypto';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { KnowledgeBaseMapper } from './knowledge-base.mapper';

describe(KnowledgeBaseMapper.name, () => {
  const mapper = new KnowledgeBaseMapper();

  it('preserves exclusive workspace ownership', () => {
    const workspaceId = randomUUID();
    const knowledgeBase = new KnowledgeBase({
      name: 'Workspace procurement rules',
      description: 'Rules used by the procurement project.',
      orgId: randomUUID(),
      workspaceId,
    });

    const record = mapper.toRecord(knowledgeBase);

    expect(mapper.toDomain(record)).toMatchObject({
      userId: null,
      workspaceId,
    });
  });
});
