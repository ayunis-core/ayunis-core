import type { UUID } from 'crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { SetKnowledgeBaseActivationCommand } from './set-knowledge-base-activation.command';
import { SetKnowledgeBaseActivationUseCase } from './set-knowledge-base-activation.use-case';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('SetKnowledgeBaseActivationUseCase', () => {
  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const ownerId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBase = new KnowledgeBase({
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Municipal regulations',
    orgId: '44444444-4444-4444-4444-444444444444',
    userId: ownerId,
  });
  let useCase: SetKnowledgeBaseActivationUseCase;
  let repository: jest.Mocked<KnowledgeBaseRepository>;
  let accessService: jest.Mocked<KnowledgeBaseAccessService>;

  beforeEach(async () => {
    repository = {
      activate: jest.fn(),
      deactivate: jest.fn(),
      getActiveIds: jest.fn(),
      findActiveAccessible: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeBaseRepository>;
    accessService = {
      findAccessibleKnowledgeBase: jest.fn().mockResolvedValue(knowledgeBase),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as ContextService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetKnowledgeBaseActivationUseCase,
        { provide: KnowledgeBaseRepository, useValue: repository },
        { provide: KnowledgeBaseAccessService, useValue: accessService },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();
    useCase = module.get(SetKnowledgeBaseActivationUseCase);
  });

  it('explicitly activates an accessible knowledge base for the current user', async () => {
    const result = await useCase.execute(
      new SetKnowledgeBaseActivationCommand(knowledgeBase.id, true),
    );

    expect(repository.activate).toHaveBeenCalledWith(knowledgeBase.id, userId);
    expect(repository.deactivate).not.toHaveBeenCalled();
    expect(result).toBe(knowledgeBase);
  });

  it('explicitly deactivates an accessible knowledge base for the current user', async () => {
    const result = await useCase.execute(
      new SetKnowledgeBaseActivationCommand(knowledgeBase.id, false),
    );

    expect(repository.deactivate).toHaveBeenCalledWith(
      knowledgeBase.id,
      userId,
    );
    expect(repository.activate).not.toHaveBeenCalled();
    expect(result).toBe(knowledgeBase);
  });

  it('preserves expected application errors', async () => {
    const expected = new KnowledgeBaseNotFoundError(knowledgeBase.id);
    accessService.findAccessibleKnowledgeBase.mockRejectedValue(expected);

    await expect(
      useCase.execute(
        new SetKnowledgeBaseActivationCommand(knowledgeBase.id, true),
      ),
    ).rejects.toBe(expected);
  });

  it('wraps unexpected errors with the knowledge-base taxonomy', async () => {
    const cause = new Error('database unavailable');
    accessService.findAccessibleKnowledgeBase.mockRejectedValue(cause);

    const execution = useCase.execute(
      new SetKnowledgeBaseActivationCommand(knowledgeBase.id, true),
    );
    await expect(execution).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
    await expect(execution).rejects.toMatchObject({ cause });
  });
});
