import { randomUUID } from 'crypto';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import type { DuplicateKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/duplicate-knowledge-base-documents/duplicate-knowledge-base-documents.use-case';
import type { CreateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { CopyPersonalKnowledgeBaseToWorkspaceCommand } from './copy-personal-knowledge-base-to-workspace.command';
import { CopyPersonalKnowledgeBaseToWorkspaceUseCase } from './copy-personal-knowledge-base-to-workspace.use-case';

describe(CopyPersonalKnowledgeBaseToWorkspaceUseCase.name, () => {
  it('creates a standalone workspace copy and duplicates its documents', async () => {
    const workspaceId = randomUUID();
    const source = new KnowledgeBase({
      name: 'Procurement law',
      description: 'Personal procurement references.',
      orgId: TEST_ORG_ID,
      userId: TEST_USER_ID,
    });
    const duplicate = new KnowledgeBase({
      name: source.name,
      description: source.description,
      orgId: TEST_ORG_ID,
      workspaceId,
    });
    const workspacesRepository = createMockWorkspacesRepository();
    workspacesRepository.findById.mockResolvedValue(
      aWorkspace({ id: workspaceId }),
    );
    const accessService = {
      findAccessibleKnowledgeBase: jest.fn().mockResolvedValue(source),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const createUseCase = {
      execute: jest.fn().mockResolvedValue(duplicate),
    } as unknown as jest.Mocked<CreateKnowledgeBaseUseCase>;
    const duplicateDocumentsUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DuplicateKnowledgeBaseDocumentsUseCase>;
    const useCase = new CopyPersonalKnowledgeBaseToWorkspaceUseCase(
      workspacesRepository,
      accessService,
      createUseCase,
      duplicateDocumentsUseCase,
      createMockContextService(),
    );

    const result = await useCase.execute(
      new CopyPersonalKnowledgeBaseToWorkspaceCommand(workspaceId, source.id),
    );

    expect(result).toBe(duplicate);
    const createCommand = createUseCase.execute.mock.calls[0]?.[0];
    expect(createCommand).toMatchObject({
      name: source.name,
      description: source.description,
      workspaceId,
    });
    expect(createCommand).not.toHaveProperty('originKnowledgeBaseId');
    expect(createCommand).not.toHaveProperty('importedOriginVersion');
    expect(duplicateDocumentsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKnowledgeBaseId: source.id,
        targetKnowledgeBaseId: duplicate.id,
      }),
    );
  });
});
