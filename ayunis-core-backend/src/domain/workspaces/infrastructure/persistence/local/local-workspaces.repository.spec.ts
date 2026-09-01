import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import type { WorkspaceMapper } from './mappers/workspace.mapper';
import type { WorkspaceRecord } from './schema/workspace.record';
import type { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import type { WorkspaceSourceAssignmentRecord } from './schema/workspace-source-assignment.record';

describe('LocalWorkspacesRepository', () => {
  it('uses a PostgreSQL-safe activity alias for paginated ordering', async () => {
    const countQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    const listQuery = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const workspaceRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(listQuery),
    } as unknown as Repository<WorkspaceRecord>;
    const mapper = {
      toDomain: jest.fn(),
    } as unknown as WorkspaceMapper;
    const repository = new LocalWorkspacesRepository(
      workspaceRepository,
      {} as Repository<SkillRecord>,
      {} as Repository<KnowledgeBaseRecord>,
      {} as Repository<WorkspaceSourceAssignmentRecord>,
      mapper,
    );

    await repository.findAllByUserId(randomUUID(), {
      sort: 'updatedAt',
      limit: 20,
      offset: 0,
    });

    expect(listQuery.addSelect).toHaveBeenCalledWith(
      expect.any(String),
      'effective_activity_at',
    );
    expect(listQuery.orderBy).toHaveBeenCalledWith(
      'effective_activity_at',
      'DESC',
    );
  });

  it('builds context references from workspace-owned resources', async () => {
    const workspaceId = randomUUID();
    const skillId = randomUUID();
    const knowledgeBaseId = randomUUID();
    const skillRepository = {
      find: jest.fn().mockResolvedValue([{ id: skillId }]),
    } as unknown as Repository<SkillRecord>;
    const knowledgeBaseRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: knowledgeBaseId,
          name: 'Procurement rules',
          description: 'Workspace rules',
        },
      ]),
    } as unknown as Repository<KnowledgeBaseRecord>;
    const sourceRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<WorkspaceSourceAssignmentRecord>;
    const repository = new LocalWorkspacesRepository(
      {} as Repository<WorkspaceRecord>,
      skillRepository,
      knowledgeBaseRepository,
      sourceRepository,
      {} as WorkspaceMapper,
    );

    await expect(repository.getContextRefs(workspaceId)).resolves.toEqual({
      skillIds: [skillId],
      knowledgeBases: [
        {
          id: knowledgeBaseId,
          name: 'Procurement rules',
          description: 'Workspace rules',
          documentCount: 0,
        },
      ],
      sourceIds: [],
    });
    expect(skillRepository.find).toHaveBeenCalledWith({
      where: { workspaceId },
      select: { id: true },
    });
    expect(knowledgeBaseRepository.find).toHaveBeenCalledWith({
      where: { workspaceId },
    });
  });
});
