import { randomUUID } from 'crypto';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import type { WorkspaceMapper } from './mappers/workspace.mapper';
import type { WorkspaceRecord } from './schema/workspace.record';
import type { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import type { KnowledgeBaseActivationRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base-activation.record';

describe('LocalWorkspacesRepository', () => {
  it('reads and saves workspaces through the active transaction', async () => {
    const workspace = { id: randomUUID() };
    const transactionRepository = {
      save: jest.fn().mockResolvedValue(workspace),
      findOne: jest.fn().mockResolvedValue(workspace),
    };
    const defaultRepository = { save: jest.fn(), findOne: jest.fn() };
    const mapper = {
      toRecord: jest.fn().mockReturnValue(workspace),
      toDomain: jest.fn().mockReturnValue(workspace),
    };
    const repository = new LocalWorkspacesRepository(
      defaultRepository as unknown as Repository<WorkspaceRecord>,
      {} as Repository<SkillRecord>,
      {} as Repository<KnowledgeBaseRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      mapper,
      {
        tx: { getRepository: () => transactionRepository },
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
    await expect(repository.findById(randomUUID(), workspace.id)).resolves.toBe(
      workspace,
    );
    await expect(repository.save(workspace as Workspace)).resolves.toBe(
      workspace,
    );
    expect(defaultRepository.save).not.toHaveBeenCalled();
    expect(defaultRepository.findOne).not.toHaveBeenCalled();
  });
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
      {} as Repository<KnowledgeBaseActivationRecord>,
      mapper,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
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
    const activationRepository = {
      find: jest.fn().mockResolvedValue([{ knowledgeBaseId }]),
    } as unknown as Repository<KnowledgeBaseActivationRecord>;
    const repository = new LocalWorkspacesRepository(
      {} as Repository<WorkspaceRecord>,
      skillRepository,
      knowledgeBaseRepository,
      activationRepository,
      {} as WorkspaceMapper,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await expect(repository.getContextRefs(workspaceId)).resolves.toEqual({
      skillIds: [skillId],
      knowledgeBases: [
        {
          id: knowledgeBaseId,
          name: 'Procurement rules',
          description: 'Workspace rules',
          documentCount: 0,
          isActive: true,
        },
      ],
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
