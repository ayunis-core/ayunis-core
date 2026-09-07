import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { randomUUID } from 'crypto';
import { KnowledgeBaseMapper } from './knowledge-base.mapper';

describe(KnowledgeBaseMapper.name, () => {
  const mapper = new KnowledgeBaseMapper();

  it('preserves exclusive workspace ownership', () => {
    const workspaceId = randomUUID();
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Workspace procurement rules',
      description: 'Rules used by the procurement project.',
      orgId: randomUUID(),
      workspaceId,
    });

    const record = mapper.toRecord(knowledgeBase);

    expect(record.userId).toBeNull();
    expect(mapper.toDomain(record)).toEqual(
      expect.objectContaining({ workspaceId }),
    );
    expect(mapper.toDomain(record)).toBeInstanceOf(WorkspaceKnowledgeBase);
  });

  it('rejects a workspace record when a personal result is required', () => {
    const record = mapper.toRecord(
      new WorkspaceKnowledgeBase({
        name: 'Workspace KB',
        orgId: randomUUID(),
        workspaceId: randomUUID(),
      }),
    );
    expect(() => mapper.toPersonal(record)).toThrow(
      'Expected personal knowledge base',
    );
  });

  it('rejects a personal record when a workspace result is required', () => {
    const record = mapper.toRecord(
      new PersonalKnowledgeBase({
        name: 'Personal KB',
        orgId: randomUUID(),
        userId: randomUUID(),
      }),
    );
    expect(() => mapper.toWorkspace(record)).toThrow(
      'Expected workspace knowledge base',
    );
  });

  it.each(['missing', 'both'] as const)('rejects %s ownership', (ownership) => {
    const record = mapper.toRecord(
      new PersonalKnowledgeBase({
        name: 'KB',
        orgId: randomUUID(),
        userId: randomUUID(),
      }),
    );
    if (ownership === 'missing') record.userId = null;
    else record.workspaceId = randomUUID();
    expect(() => mapper.toDomain(record)).toThrow('invalid ownership');
  });

  it('preserves exclusive personal ownership', () => {
    const userId = randomUUID();
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Personal regulations',
      orgId: randomUUID(),
      userId,
    });

    const record = mapper.toRecord(knowledgeBase);

    expect(record.workspaceId).toBeNull();
    expect(mapper.toDomain(record)).toEqual(
      expect.objectContaining({ userId }),
    );
    expect(mapper.toDomain(record)).toBeInstanceOf(PersonalKnowledgeBase);
  });
});
