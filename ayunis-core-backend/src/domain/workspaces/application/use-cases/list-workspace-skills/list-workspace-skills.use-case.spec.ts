import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { ListWorkspaceSkillsUseCase } from './list-workspace-skills.use-case';
import { ListWorkspaceSkillsQuery } from './list-workspace-skills.query';

describe('ListWorkspaceSkillsUseCase', () => {
  it('returns the paginated skills attached to a workspace', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const skill = new Skill({
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Citizen requests',
      shortDescription: 'Handles citizen requests',
      instructions: 'Use the request workflow',
      userId: '323e4567-e89b-12d3-a456-426614174002',
    });
    const page = new Paginated({
      data: [skill],
      limit: 2,
      offset: 4,
      total: 5,
    });
    const workspacesRepository = {
      findById: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<WorkspacesRepository>;
    const listAccessibleSkillsUseCase = {
      execute: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<ListAccessibleSkillsUseCase>;
    const contextService = {
      get: jest.fn().mockReturnValue('423e4567-e89b-12d3-a456-426614174003'),
    } as unknown as jest.Mocked<ContextService>;
    const useCase = new ListWorkspaceSkillsUseCase(
      createPinoLoggerMock(),
      workspacesRepository,
      listAccessibleSkillsUseCase,
      contextService,
    );

    const result = await useCase.execute(
      new ListWorkspaceSkillsQuery({
        workspaceId,
        search: 'citizen',
        limit: 2,
        offset: 4,
      }),
    );

    expect(result).toBe(page);
    expect(listAccessibleSkillsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'citizen',
        workspaceId,
        limit: 2,
        offset: 4,
      }),
    );
  });
});
