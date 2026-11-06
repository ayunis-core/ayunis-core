import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
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

  it('round-trips team ownership and its global state', () => {
    const teamId = randomUUID();
    const record = mapper.toRecord(
      new TeamKnowledgeBase({
        name: 'Bauordnung',
        orgId: randomUUID(),
        teamId,
        isActive: true,
      }),
    );

    expect(record).toMatchObject({
      userId: null,
      workspaceId: null,
      teamId,
      isOrgOwned: false,
      isActive: true,
    });
    expect(mapper.toDomain(record)).toBeInstanceOf(TeamKnowledgeBase);
    expect(mapper.toDomain(record)).toMatchObject({ teamId, isActive: true });
    expect(() => mapper.toPersonal(record)).toThrow(
      'Expected personal knowledge base',
    );
  });

  it('round-trips organization ownership', () => {
    const record = mapper.toRecord(
      new OrgKnowledgeBase({ name: 'Satzungen', orgId: randomUUID() }),
    );

    expect(record).toMatchObject({
      userId: null,
      workspaceId: null,
      teamId: null,
      isOrgOwned: true,
      isActive: false,
    });
    const mapped = mapper.toDomain(record);
    expect(mapped).toBeInstanceOf(OrgKnowledgeBase);
    expect(mapped).not.toBeInstanceOf(TeamKnowledgeBase);
  });

  it('never treats a record without an owner as organization-owned', () => {
    const record = mapper.toRecord(
      new OrgKnowledgeBase({ name: 'Satzungen', orgId: randomUUID() }),
    );
    record.isOrgOwned = false;

    expect(() => mapper.toDomain(record)).toThrow('invalid ownership');
  });

  it('rejects team ownership combined with organization ownership', () => {
    const record = mapper.toRecord(
      new TeamKnowledgeBase({
        name: 'Bauordnung',
        orgId: randomUUID(),
        teamId: randomUUID(),
      }),
    );
    record.isOrgOwned = true;

    expect(() => mapper.toDomain(record)).toThrow('invalid ownership');
  });

  it('never stores global state for personal knowledge bases', () => {
    const record = mapper.toRecord(
      new PersonalKnowledgeBase({
        name: 'Notizen',
        orgId: randomUUID(),
        userId: randomUUID(),
      }),
    );

    expect(record).toMatchObject({
      teamId: null,
      isOrgOwned: false,
      isActive: false,
    });
  });
});
