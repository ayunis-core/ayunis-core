import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_TEAM_ID,
} from '../../testing/credit-limit.fixtures';
import { RemoveTeamCreditLimitUseCase } from './remove-team-credit-limit.use-case';
import { RemoveTeamCreditLimitCommand } from './remove-team-credit-limit.command';

describe('RemoveTeamCreditLimitUseCase', () => {
  let useCase: RemoveTeamCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = TEST_ORG_ID;
  const teamId = TEST_TEAM_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveTeamCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => orgId } },
      ],
    }).compile();

    useCase = module.get(RemoveTeamCreditLimitUseCase);
  });

  it('deletes the limit by team id', async () => {
    await useCase.execute(new RemoveTeamCreditLimitCommand(teamId));

    expect(repository.deleteByTeamId).toHaveBeenCalledWith(orgId, teamId);
    expect(repository.deleteByUserId).not.toHaveBeenCalled();
  });
});
