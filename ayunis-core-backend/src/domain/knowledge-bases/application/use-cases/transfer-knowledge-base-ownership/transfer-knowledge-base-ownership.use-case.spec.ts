jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import { KnowledgeBaseOwnerChangedError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TransferKnowledgeBaseOwnershipCommand } from './transfer-knowledge-base-ownership.command';
import { TransferKnowledgeBaseOwnershipUseCase } from './transfer-knowledge-base-ownership.use-case';

const USER_ID = randomUUID();
const ORG_ID = randomUUID();

function setup(moved: boolean) {
  const knowledgeBase = new PersonalKnowledgeBase({
    name: 'Bauordnung',
    userId: USER_ID,
    orgId: ORG_ID,
  });
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    isActive: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<KnowledgeBaseRepository>;
  const collectiveRepository = {
    transferFromPersonal: jest.fn().mockResolvedValue(moved),
    setActive: jest.fn(),
  } as unknown as jest.Mocked<CollectiveKnowledgeBaseRepository>;
  const useCase = new TransferKnowledgeBaseOwnershipUseCase(
    repository,
    collectiveRepository,
  );
  const command = new TransferKnowledgeBaseOwnershipCommand(
    knowledgeBase.id,
    USER_ID,
    { type: 'org' },
  );
  return { useCase, command, collectiveRepository };
}

describe(TransferKnowledgeBaseOwnershipUseCase.name, () => {
  it('moves the knowledge base only while the requester still owns it', async () => {
    const { useCase, command, collectiveRepository } = setup(true);

    await useCase.execute(command);

    expect(collectiveRepository.transferFromPersonal).toHaveBeenCalledWith(
      command.knowledgeBaseId,
      { teamId: null, submittedByUserId: USER_ID },
    );
  });

  it('fails when another handover moved the knowledge base first', async () => {
    const { useCase, command } = setup(false);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      KnowledgeBaseOwnerChangedError,
    );
  });
});
