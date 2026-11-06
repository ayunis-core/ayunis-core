import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { randomUUID } from 'crypto';

import { SkillMapper } from './skill.mapper';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

describe(SkillMapper.name, () => {
  const mapper = new SkillMapper();

  it.each([
    { userId: null, workspaceId: null },
    { userId: randomUUID(), workspaceId: randomUUID() },
    { userId: randomUUID(), teamId: randomUUID() },
    { teamId: randomUUID(), orgId: randomUUID() },
    { workspaceId: randomUUID(), orgId: randomUUID() },
  ])('rejects invalid ownership: %j', (owners) => {
    const record = Object.assign(new SkillRecord(), {
      id: randomUUID(),
      ...owners,
    });
    expect(() => mapper.toDomain(record)).toThrow('invalid ownership');
  });

  it('preserves personal ownership and rejects scope mismatches', () => {
    const personal = new PersonalSkill({
      name: 'Personal skill',
      shortDescription: '',
      instructions: '',
      userId: randomUUID(),
    });
    const record = mapper.toRecord(personal);
    expect(mapper.toPersonal(record)).toBeInstanceOf(PersonalSkill);
    expect(record.workspaceId).toBeNull();
    expect(() => mapper.toWorkspace(record)).toThrow(
      'Expected workspace skill',
    );
  });

  it('preserves exclusive workspace ownership', () => {
    const workspaceId = randomUUID();
    const skill = new WorkspaceSkill({
      name: 'Workspace procurement review',
      shortDescription: 'Reviews procurement documents.',
      instructions: 'Check the procurement requirements.',
      workspaceId,
    });

    const record = mapper.toRecord(skill);
    record.createdAt = skill.createdAt;
    record.updatedAt = skill.updatedAt;
    record.sources = [];
    record.mcpIntegrations = [];
    record.knowledgeBases = [];

    expect(mapper.toWorkspace(record)).toBeInstanceOf(WorkspaceSkill);
    expect(record.userId).toBeNull();
    expect(() => mapper.toPersonal(record)).toThrow('Expected personal skill');
    expect(mapper.toDomain(record)).toMatchObject({
      workspaceId,
    });
  });

  it('maps legacy records to personal resources', () => {
    const record = Object.assign(new SkillRecord(), {
      id: randomUUID(),
      name: 'Citizen requests',
      shortDescription: 'Handles citizen requests.',
      instructions: 'Answer the request.',
      marketplaceIdentifier: null,
      userId: randomUUID(),
      workspaceId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(mapper.toPersonal(record).userId).toBe(record.userId);
  });

  it('round-trips team ownership and its global state', () => {
    const teamId = randomUUID();
    const skill = new TeamSkill({
      name: 'Council minutes',
      shortDescription: 'Drafts council meeting minutes.',
      instructions: 'Summarise each agenda item.',
      teamId,
      isActive: true,
      isPinned: true,
    });

    const record = mapper.toRecord(skill);

    expect(record).toMatchObject({
      userId: null,
      workspaceId: null,
      teamId,
      orgId: null,
      isActive: true,
      isPinned: true,
    });
    const mapped = mapper.toDomain(record);
    expect(mapped).toBeInstanceOf(TeamSkill);
    expect(mapped).toMatchObject({ teamId, isActive: true, isPinned: true });
    expect(() => mapper.toPersonal(record)).toThrow('Expected personal skill');
  });

  it('round-trips organization ownership and its global state', () => {
    const orgId = randomUUID();
    const skill = new OrgSkill({
      name: 'Press release',
      shortDescription: 'Writes press releases.',
      instructions: 'Use the municipal style guide.',
      orgId,
      isActive: true,
    });

    const record = mapper.toRecord(skill);

    expect(record).toMatchObject({
      userId: null,
      workspaceId: null,
      teamId: null,
      orgId,
      isActive: true,
      isPinned: false,
    });
    expect(mapper.toDomain(record)).toBeInstanceOf(OrgSkill);
  });

  it('never stores global state for personal skills', () => {
    const record = mapper.toRecord(
      new PersonalSkill({
        name: 'Personal skill',
        shortDescription: '',
        instructions: '',
        userId: randomUUID(),
      }),
    );

    expect(record).toMatchObject({
      teamId: null,
      orgId: null,
      isActive: false,
      isPinned: false,
    });
  });
});
