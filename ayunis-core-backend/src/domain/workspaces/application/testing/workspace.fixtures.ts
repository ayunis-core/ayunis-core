import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
export const TEST_ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
export const TEST_WORKSPACE_ID = '33333333-3333-4333-8333-333333333333' as UUID;

export function aWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return new Workspace({
    id: TEST_WORKSPACE_ID,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    name: 'Bürgeranfragen',
    description: null,
    icon: 'folder',
    color: 'violet',
    isPinned: true,
    sortOrder: 0,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    ...overrides,
  });
}

export function createMockContextService(
  values: { userId?: UUID; orgId?: UUID } = {
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  },
): jest.Mocked<ContextService> {
  return {
    get: jest.fn((key: string) => values[key as keyof typeof values]),
  } as unknown as jest.Mocked<ContextService>;
}

export function createMockWorkspacesRepository(): jest.Mocked<WorkspacesRepository> {
  return {
    findAllByUserId: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest
      .fn()
      .mockImplementation((workspace: Workspace) => Promise.resolve(workspace)),
    saveSettings: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    togglePinned: jest.fn().mockResolvedValue(true),
    updateSortOrders: jest.fn().mockResolvedValue(undefined),
  };
}
