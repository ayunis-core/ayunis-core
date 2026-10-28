import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { randomUUID } from 'crypto';

import { SkillMapper } from './skill.mapper';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

describe(SkillMapper.name, () => {
  const mapper = new SkillMapper();

  it.each([
    { userId: null, workspaceId: null },
    { userId: randomUUID(), workspaceId: randomUUID() },
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
});
