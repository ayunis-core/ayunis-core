import { randomUUID } from 'crypto';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillMapper } from './skill.mapper';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

describe(SkillMapper.name, () => {
  const mapper = new SkillMapper();

  it('preserves workspace ownership and copy provenance', () => {
    const workspaceId = randomUUID();
    const originSkillId = randomUUID();
    const skill = new Skill({
      name: 'Workspace procurement review',
      shortDescription: 'Reviews procurement documents.',
      instructions: 'Check the procurement requirements.',
      userId: randomUUID(),
      workspaceId,
      originSkillId,
      version: 4,
      importedOriginVersion: 3,
      dismissedOriginVersion: 5,
    });

    const record = mapper.toRecord(skill);
    record.createdAt = skill.createdAt;
    record.updatedAt = skill.updatedAt;
    record.sources = [];
    record.mcpIntegrations = [];
    record.knowledgeBases = [];

    expect(mapper.toDomain(record)).toMatchObject({
      workspaceId,
      originSkillId,
      version: 4,
      importedOriginVersion: 3,
      dismissedOriginVersion: 5,
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
      originSkillId: null,
      version: 1,
      importedOriginVersion: null,
      dismissedOriginVersion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(mapper.toDomain(record).workspaceId).toBeNull();
  });
});
