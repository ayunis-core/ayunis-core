import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_: object, __: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { WorkspaceTutorialProvisioningService } from './workspace-tutorial-provisioning.service';

const USER_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as UUID;
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000003' as UUID;
const SKILL_ID = '00000000-0000-0000-0000-000000000004' as UUID;
const KNOWLEDGE_BASE_ID = '00000000-0000-0000-0000-000000000005' as UUID;

describe(WorkspaceTutorialProvisioningService.name, () => {
  const contextRunner = {
    runForUser: jest.fn(
      (_userId: UUID, _orgId: UUID, fn: () => Promise<void>) => fn(),
    ),
  };
  const createWorkspace = { execute: jest.fn() };
  const createSkill = { execute: jest.fn() };
  const createKnowledgeBase = { execute: jest.fn() };
  const assignKnowledgeBase = { execute: jest.fn() };
  const addUrl = { execute: jest.fn() };
  const service = new WorkspaceTutorialProvisioningService(
    contextRunner as never,
    createWorkspace as never,
    createSkill as never,
    createKnowledgeBase as never,
    assignKnowledgeBase as never,
    addUrl as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    createWorkspace.execute.mockResolvedValue({ id: WORKSPACE_ID });
    createSkill.execute.mockResolvedValue({ id: SKILL_ID });
    createKnowledgeBase.execute.mockResolvedValue({ id: KNOWLEDGE_BASE_ID });
    assignKnowledgeBase.execute.mockResolvedValue(undefined);
    addUrl.execute.mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates the workspace, linked skill and collection as the user, then schedules the article', async () => {
    await service.provisionFor(USER_ID, ORG_ID);

    expect(contextRunner.runForUser).toHaveBeenCalledWith(
      USER_ID,
      ORG_ID,
      expect.any(Function),
    );
    expect(createWorkspace.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: "So geht's | Arbeitsbereiche" }),
    );
    const owner = { type: 'workspace', workspaceId: WORKSPACE_ID };
    expect(createSkill.execute).toHaveBeenCalledWith(
      expect.objectContaining({ owner }),
    );
    expect(createKnowledgeBase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ owner }),
    );
    expect(assignKnowledgeBase.execute).toHaveBeenCalledWith({
      skillId: SKILL_ID,
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
    });
    expect(addUrl.execute).toHaveBeenCalledWith({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      url: 'https://help.ayunis.com/de/workspaces/',
      maxDepth: 0,
    });
    expect(
      assignKnowledgeBase.execute.mock.invocationCallOrder[0],
    ).toBeLessThan(addUrl.execute.mock.invocationCallOrder[0]);
  });

  it('logs article scheduling failures without undoing the tutorial', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const failure = new Error('queue unavailable');
    addUrl.execute.mockRejectedValue(failure);

    await expect(
      service.provisionFor(USER_ID, ORG_ID),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        err: failure,
      }),
      'Failed to attach tutorial Help Center article',
    );
  });

  it('propagates template failures and schedules no article', async () => {
    const failure = new Error('resource creation failed');
    createSkill.execute.mockRejectedValue(failure);

    await expect(service.provisionFor(USER_ID, ORG_ID)).rejects.toBe(failure);
    expect(addUrl.execute).not.toHaveBeenCalled();
  });
});
