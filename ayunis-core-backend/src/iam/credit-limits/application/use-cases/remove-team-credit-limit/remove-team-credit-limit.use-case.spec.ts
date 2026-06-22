import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { RemoveTeamCreditLimitUseCase } from './remove-team-credit-limit.use-case';
import { RemoveTeamCreditLimitCommand } from './remove-team-credit-limit.command';

describe('RemoveTeamCreditLimitUseCase', () => {
  let useCase: RemoveTeamCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findUserLimits: jest.fn(),
      findTeamLimits: jest.fn(),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
      deleteByTeamId: jest.fn().mockResolvedValue(undefined),
    };

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
