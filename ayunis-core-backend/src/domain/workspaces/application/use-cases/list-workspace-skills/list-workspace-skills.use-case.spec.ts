import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
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
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const listAccessibleSkillsUseCase = {
      execute: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<ListAccessibleSkillsUseCase>;
    const useCase = new ListWorkspaceSkillsUseCase(
      createPinoLoggerMock(),
      listAccessibleSkillsUseCase,
      accessService as never,
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
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      workspaceId,
      WorkspaceAccessLevel.USE,
    );
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
