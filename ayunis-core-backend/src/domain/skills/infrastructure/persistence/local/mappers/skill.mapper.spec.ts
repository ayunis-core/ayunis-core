import { randomUUID } from 'crypto';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillMapper } from './skill.mapper';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

describe(SkillMapper.name, () => {
  const mapper = new SkillMapper();

  it('preserves exclusive workspace ownership', () => {
    const workspaceId = randomUUID();
    const skill = new Skill({
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

    expect(mapper.toDomain(record)).toMatchObject({
      userId: null,
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

    expect(mapper.toDomain(record).workspaceId).toBeNull();
  });
});
