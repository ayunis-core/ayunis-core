import type { UUID } from 'crypto';
import type { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import type { FindAccessibleKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-accessible-knowledge-bases-by-ids/find-accessible-knowledge-bases-by-ids.use-case';
import type { FindActiveKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-active-knowledge-bases/find-active-knowledge-bases.use-case';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { FindActiveSkillsUseCase } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.use-case';
import type { FindThreadContextRefsUseCase } from 'src/domain/threads/application/use-cases/find-thread-context-refs/find-thread-context-refs.use-case';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { GetWorkspaceAiContextUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-ai-context/get-workspace-ai-context.use-case';
import { UnexpectedRunError } from 'src/domain/runs/application/runs.errors';
import { GetThreadAiContextUseCase } from './get-thread-ai-context.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const ORG_ID = '33333333-3333-4333-8333-333333333333' as UUID;
const THREAD_ID = '44444444-4444-4444-8444-444444444444' as UUID;
const WORKSPACE_ID = '55555555-5555-4555-8555-555555555555' as UUID;

function personalKnowledgeBase(name: string, userId = USER_ID) {
  return new PersonalKnowledgeBase({ name, userId, orgId: ORG_ID });
}

function setup() {
  const activeKnowledgeBase = personalKnowledgeBase('Building regulations');
  const attachedKnowledgeBase = personalKnowledgeBase(
    'Shared planning guidance',
    OTHER_USER_ID,
  );
  const staleKnowledgeBase = personalKnowledgeBase(
    'Revoked policy archive',
    OTHER_USER_ID,
  );
  const threadRefs = {
    workspaceId: null as UUID | null,
    knowledgeBaseIds: [
      activeKnowledgeBase.id,
      attachedKnowledgeBase.id,
      staleKnowledgeBase.id,
    ],
  };
  const activeSkill = new PersonalSkill({
    name: 'Permit review',
    shortDescription: 'Reviews municipal permit applications',
    instructions: 'Review the permit application.',
    userId: USER_ID,
  });
  const findThreadContextRefs = {
    execute: jest.fn().mockResolvedValue(threadRefs),
  } as unknown as jest.Mocked<FindThreadContextRefsUseCase>;
  const findActiveSkills = {
    execute: jest.fn().mockResolvedValue([activeSkill]),
  } as unknown as jest.Mocked<FindActiveSkillsUseCase>;
  const findActiveKnowledgeBases = {
    execute: jest.fn().mockResolvedValue([activeKnowledgeBase]),
  } as unknown as jest.Mocked<FindActiveKnowledgeBasesUseCase>;
  const findAccessibleKnowledgeBasesByIds = {
    execute: jest
      .fn()
      .mockResolvedValue([activeKnowledgeBase, attachedKnowledgeBase]),
  } as unknown as jest.Mocked<FindAccessibleKnowledgeBasesByIdsUseCase>;
  const countKnowledgeBaseDocuments = {
    execute: jest.fn().mockResolvedValue(
      new Map<UUID, number>([
        [activeKnowledgeBase.id, 4],
        [attachedKnowledgeBase.id, 2],
      ]),
    ),
  } as unknown as jest.Mocked<CountKnowledgeBaseDocumentsUseCase>;
  const buildWorkspaceRunContext = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetWorkspaceAiContextUseCase>;
  const features = {
    knowledgeBasesEnabled: true,
    letterheadsEnabled: false,
    skillsEnabled: true,
    workspacesEnabled: true,
    ssoLoginEnabled: false,
  };
  const useCase = new GetThreadAiContextUseCase(
    findThreadContextRefs,
    findActiveSkills,
    findActiveKnowledgeBases,
    findAccessibleKnowledgeBasesByIds,
    countKnowledgeBaseDocuments,
    buildWorkspaceRunContext,
    features,
  );
  return {
    useCase,
    threadRefs,
    activeSkill,
    activeKnowledgeBase,
    attachedKnowledgeBase,
    staleKnowledgeBase,
    findThreadContextRefs,
    findActiveSkills,
    findActiveKnowledgeBases,
    findAccessibleKnowledgeBasesByIds,
    countKnowledgeBaseDocuments,
    buildWorkspaceRunContext,
    features,
  };
}

describe(GetThreadAiContextUseCase.name, () => {
  it('returns active personal/shared resources and accessible thread attachments for a regular chat', async () => {
    const {
      useCase,
      activeSkill,
      activeKnowledgeBase,
      attachedKnowledgeBase,
      staleKnowledgeBase,
      findAccessibleKnowledgeBasesByIds,
      countKnowledgeBaseDocuments,
      buildWorkspaceRunContext,
    } = setup();

    const result = await useCase.execute({ threadId: THREAD_ID });

    expect(result.skills).toEqual([
      {
        id: activeSkill.id,
        name: activeSkill.name,
        shortDescription: activeSkill.shortDescription,
        workspaceId: null,
      },
    ]);
    expect(result.knowledgeBases).toEqual([
      {
        id: activeKnowledgeBase.id,
        name: activeKnowledgeBase.name,
        documentCount: 4,
        workspaceId: null,
      },
      {
        id: attachedKnowledgeBase.id,
        name: attachedKnowledgeBase.name,
        documentCount: 2,
        workspaceId: null,
      },
    ]);
    expect(result.knowledgeBases).not.toContainEqual(
      expect.objectContaining({ id: staleKnowledgeBase.id }),
    );
    expect(findAccessibleKnowledgeBasesByIds.execute).toHaveBeenCalledWith({
      knowledgeBaseIds: [
        activeKnowledgeBase.id,
        attachedKnowledgeBase.id,
        staleKnowledgeBase.id,
      ],
    });
    expect(countKnowledgeBaseDocuments.execute).toHaveBeenCalledWith({
      knowledgeBaseIds: [activeKnowledgeBase.id, attachedKnowledgeBase.id],
    });
    expect(buildWorkspaceRunContext.execute).not.toHaveBeenCalled();
  });

  it('adds active workspace resources without deduplicating same-named skills', async () => {
    const { useCase, threadRefs, activeSkill, buildWorkspaceRunContext } =
      setup();
    threadRefs.workspaceId = WORKSPACE_ID;
    const workspaceSkill = new WorkspaceSkill({
      name: activeSkill.name,
      shortDescription: 'Applies project-specific permit rules',
      instructions: 'Apply the project permit rules.',
      workspaceId: WORKSPACE_ID,
    });
    const inactiveWorkspaceSkill = new WorkspaceSkill({
      name: 'Archived permit workflow',
      shortDescription: 'An inactive project workflow',
      instructions: 'Do not apply this workflow.',
      workspaceId: WORKSPACE_ID,
    });
    const workspaceKnowledgeBaseId =
      '66666666-6666-4666-8666-666666666666' as UUID;
    const inactiveWorkspaceKnowledgeBaseId =
      '77777777-7777-4777-8777-777777777777' as UUID;
    buildWorkspaceRunContext.execute.mockResolvedValue({
      instruction: null,
      skills: [
        { skill: workspaceSkill, isActive: true, isPinned: false },
        {
          skill: inactiveWorkspaceSkill,
          isActive: false,
          isPinned: false,
        },
      ],
      knowledgeBases: [
        {
          id: workspaceKnowledgeBaseId,
          name: 'Building regulations',
          description: 'Project-specific regulations',
          documentCount: 7,
          isActive: true,
        },
        {
          id: inactiveWorkspaceKnowledgeBaseId,
          name: 'Archived project regulations',
          description: 'Inactive project-specific regulations',
          documentCount: 3,
          isActive: false,
        },
      ],
    });

    const result = await useCase.execute({ threadId: THREAD_ID });

    expect(result.skills).toEqual([
      expect.objectContaining({ id: activeSkill.id, workspaceId: null }),
      expect.objectContaining({
        id: workspaceSkill.id,
        name: activeSkill.name,
        workspaceId: WORKSPACE_ID,
      }),
    ]);
    expect(result.knowledgeBases).toContainEqual({
      id: workspaceKnowledgeBaseId,
      name: 'Building regulations',
      documentCount: 7,
      workspaceId: WORKSPACE_ID,
    });
    expect(result.skills).not.toContainEqual(
      expect.objectContaining({ id: inactiveWorkspaceSkill.id }),
    );
    expect(result.knowledgeBases).not.toContainEqual(
      expect.objectContaining({ id: inactiveWorkspaceKnowledgeBaseId }),
    );
  });

  it('rejects a non-owner before resolving any resources', async () => {
    const {
      useCase,
      findThreadContextRefs,
      findActiveSkills,
      findActiveKnowledgeBases,
      findAccessibleKnowledgeBasesByIds,
    } = setup();
    const error = new ThreadNotFoundError(THREAD_ID, OTHER_USER_ID);
    findThreadContextRefs.execute.mockRejectedValue(error);

    await expect(useCase.execute({ threadId: THREAD_ID })).rejects.toBe(error);
    expect(findActiveSkills.execute).not.toHaveBeenCalled();
    expect(findActiveKnowledgeBases.execute).not.toHaveBeenCalled();
    expect(findAccessibleKnowledgeBasesByIds.execute).not.toHaveBeenCalled();
  });

  it('hides skills when the skills feature is disabled', async () => {
    const { useCase, features, findActiveSkills } = setup();
    features.skillsEnabled = false;

    const result = await useCase.execute({ threadId: THREAD_ID });

    expect(result.skills).toEqual([]);
    expect(findActiveSkills.execute).not.toHaveBeenCalled();
  });

  it('wraps unexpected context assembly failures', async () => {
    const { useCase, findActiveSkills } = setup();
    findActiveSkills.execute.mockRejectedValue(new Error('database offline'));

    await expect(
      useCase.execute({ threadId: THREAD_ID }),
    ).rejects.toBeInstanceOf(UnexpectedRunError);
  });
});
