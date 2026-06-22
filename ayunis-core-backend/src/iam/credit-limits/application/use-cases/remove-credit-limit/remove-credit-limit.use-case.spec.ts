import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { RemoveCreditLimitUseCase } from './remove-credit-limit.use-case';
import { RemoveCreditLimitCommand } from './remove-credit-limit.command';

describe('RemoveCreditLimitUseCase', () => {
  let useCase: RemoveCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const targetId = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findByOrg: jest.fn(),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
      deleteByTeamId: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => orgId } },
      ],
    }).compile();

    useCase = module.get(RemoveCreditLimitUseCase);
  });

  it('deletes a user-scoped limit by user id', async () => {
    await useCase.execute(
      new RemoveCreditLimitCommand(CreditLimitScope.USER, targetId),
    );

    expect(repository.deleteByUserId).toHaveBeenCalledWith(orgId, targetId);
    expect(repository.deleteByTeamId).not.toHaveBeenCalled();
  });

  it('deletes a team-scoped limit by team id', async () => {
    await useCase.execute(
      new RemoveCreditLimitCommand(CreditLimitScope.TEAM, targetId),
    );

    expect(repository.deleteByTeamId).toHaveBeenCalledWith(orgId, targetId);
    expect(repository.deleteByUserId).not.toHaveBeenCalled();
  });
});
