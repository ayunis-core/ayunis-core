import { randomUUID, type UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import {
  SkillSourceLimitExceededError,
  SkillNotFoundError,
} from 'src/domain/skills/application/skills.errors';
import { SkillsConstants } from 'src/domain/skills/domain/skills.constants';
import { SkillMapper } from './mappers/skill.mapper';
import { updateSkill } from './local-skill-update.repository-helper';

type RelationName = 'sources' | 'knowledgeBases' | 'mcpIntegrations';
function relationWriter(
  record: Record<RelationName, { id: UUID }[]>,
  name: RelationName,
) {
  return {
    add: async (ids: UUID[]) => {
      record[name].push(...ids.map((id) => ({ id })));
    },
    remove: async (ids: UUID[]) => {
      record[name] = record[name].filter(({ id }) => !ids.includes(id));
    },
  };
}

describe('skill update deltas', () => {
  const mapper = new SkillMapper();
  const original = new WorkspaceSkill({
    name: 'Permit review',
    shortDescription: 'Review permits',
    instructions: 'Check regulations.',
    workspaceId: randomUUID(),
  });

  function setup(current: WorkspaceSkill) {
    const record = {
      ...mapper.toRecord(current),
      sources: current.sourceIds.map((id) => ({ id })),
      knowledgeBases: current.knowledgeBaseIds.map((id) => ({ id })),
      mcpIntegrations: current.mcpIntegrationIds.map((id) => ({ id })),
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(record),
      findOneOrFail: jest.fn().mockResolvedValue(record),
      update: jest
        .fn()
        .mockImplementation(async (_id, values) =>
          Object.assign(record, values),
        ),
    };
    const manager = {
      transaction: async (work: (tx: unknown) => unknown) => work(manager),
      getRepository: () => repository,
      createQueryBuilder: () => ({
        relation: (
          _entity: unknown,
          name: 'sources' | 'knowledgeBases' | 'mcpIntegrations',
        ) => ({
          of: () => relationWriter(record, name),
        }),
      }),
    };
    return { manager: manager as unknown as EntityManager, repository };
  }

  it('keeps a concurrently added knowledge base while renaming', async () => {
    const knowledgeBaseId = randomUUID();
    const { manager } = setup(
      original.withUpdates({ knowledgeBaseIds: [knowledgeBaseId] }),
    );
    const result = await updateSkill(
      manager,
      mapper,
      original.withUpdates({ name: 'Updated permit review' }),
      original,
    );
    expect(result.name).toBe('Updated permit review');
    expect(result.knowledgeBaseIds).toEqual([knowledgeBaseId]);
  });

  it('preserves concurrent scalar edits and unions independently added relationships', async () => {
    const first = randomUUID(),
      second = randomUUID();
    const { manager } = setup(
      original.withUpdates({
        name: 'Renamed by another edit',
        sourceIds: [first],
      }),
    );
    const result = await updateSkill(
      manager,
      mapper,
      original.withUpdates({ sourceIds: [second] }),
      original,
    );
    expect(result.name).toBe('Renamed by another edit');
    expect(result.sourceIds).toEqual([first, second]);
  });

  it('does not resurrect a concurrently removed relationship during a rename', async () => {
    const previous = original.withUpdates({ knowledgeBaseIds: [randomUUID()] });
    const { manager } = setup(original);
    const result = await updateSkill(
      manager,
      mapper,
      previous.withUpdates({ name: 'Renamed' }),
      previous,
    );
    expect(result.knowledgeBaseIds).toEqual([]);
  });

  it('checks capacity against the locked current source set', async () => {
    const { manager } = setup(
      original.withUpdates({
        sourceIds: Array.from({ length: SkillsConstants.MAX_SOURCES }, () =>
          randomUUID(),
        ),
      }),
    );
    await expect(
      updateSkill(
        manager,
        mapper,
        original.withUpdates({ sourceIds: [randomUUID()] }),
        original,
      ),
    ).rejects.toBeInstanceOf(SkillSourceLimitExceededError);
  });

  it('does not recreate a deleted skill', async () => {
    const { manager, repository } = setup(original);
    repository.findOne.mockResolvedValue(null);
    await expect(
      updateSkill(manager, mapper, original, original),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
