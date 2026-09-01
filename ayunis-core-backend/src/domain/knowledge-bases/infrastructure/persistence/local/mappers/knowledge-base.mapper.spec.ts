import { randomUUID } from 'crypto';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { KnowledgeBaseMapper } from './knowledge-base.mapper';

describe(KnowledgeBaseMapper.name, () => {
  const mapper = new KnowledgeBaseMapper();

  it('preserves workspace ownership and copy provenance', () => {
    const workspaceId = randomUUID();
    const originKnowledgeBaseId = randomUUID();
    const knowledgeBase = new KnowledgeBase({
      name: 'Workspace procurement rules',
      description: 'Rules used by the procurement project.',
      orgId: randomUUID(),
      workspaceId,
      originKnowledgeBaseId,
      version: 4,
      importedOriginVersion: 3,
      dismissedOriginVersion: 5,
    });

    const record = mapper.toRecord(knowledgeBase);

    expect(mapper.toDomain(record)).toMatchObject({
      userId: null,
      workspaceId,
      originKnowledgeBaseId,
      version: 4,
      importedOriginVersion: 3,
      dismissedOriginVersion: 5,
    });
  });
});
