import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import type { WorkspaceMapper } from './mappers/workspace.mapper';
import type { WorkspaceRecord } from './schema/workspace.record';
import type { WorkspaceSkillAssignmentRecord } from './schema/workspace-skill-assignment.record';
import type { WorkspaceKnowledgeBaseAssignmentRecord } from './schema/workspace-knowledge-base-assignment.record';
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
      {} as Repository<WorkspaceSkillAssignmentRecord>,
      {} as Repository<WorkspaceKnowledgeBaseAssignmentRecord>,
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
});
