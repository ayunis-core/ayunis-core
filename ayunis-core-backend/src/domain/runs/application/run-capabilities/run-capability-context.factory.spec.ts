import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import type { UUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import {
  aCapabilityContext,
  aThread,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { RunCapabilityContextFactory } from './run-capability-context.factory';

const workspaceId = '99999999-9999-4999-8999-999999999999' as UUID;

function aWorkspaceSkill(name: string, shortDescription: string) {
  return new WorkspaceSkill({
    name,
    shortDescription,
    instructions: `Follow the ${name} process.`,
    workspaceId,
  });
}

function aWorkspaceContext(
  overrides: Partial<WorkspaceRunContext> = {},
): WorkspaceRunContext {
  return {
    instruction: null,
    skills: [],
    knowledgeBases: [],
    runtimeKnowledgeBases: [],
    ...overrides,
  };
}

function buildFactory(
  options: {
    workspaceContext?: WorkspaceRunContext;
    activeSkills?: PersonalSkill[];
    activeKnowledgeBases?: KnowledgeBaseSummary[];
    templates?: () => Promise<unknown[]>;
  } = {},
) {
  const buildWorkspaceContext = jest
    .fn()
    .mockResolvedValue(options.workspaceContext);
  const findActiveSkills = jest
    .fn()
    .mockResolvedValue(options.activeSkills ?? []);
  const findActiveKnowledgeBases = jest
    .fn()
    .mockResolvedValue(options.activeKnowledgeBases ?? []);
  const findTemplates = jest.fn(
    options.templates ?? (() => Promise.resolve([])),
  );
  const factory = new RunCapabilityContextFactory(
    { execute: buildWorkspaceContext } as never,
    { execute: findActiveSkills } as never,
    { execute: findActiveKnowledgeBases } as never,
    { execute: findTemplates } as never,
  );
  const create = (thread = aThread({ workspaceId })) =>
    factory.create({
      thread,
      model: aCapabilityContext().model,
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      isAnonymous: false,
    });
  return {
    create,
    buildWorkspaceContext,
    findActiveSkills,
    findActiveKnowledgeBases,
  };
}

describe('RunCapabilityContextFactory', () => {
  it('loads the workspace context once for a workspace thread', async () => {
    const workspaceContext = aWorkspaceContext({ instruction: 'Sie-Form.' });
    const { create, buildWorkspaceContext } = buildFactory({
      workspaceContext,
    });

    const context = await create();

    expect(context.workspaceContext).toBe(workspaceContext);
    expect(buildWorkspaceContext).toHaveBeenCalledTimes(1);
  });

  it('does not look up a workspace context for a thread outside a workspace', async () => {
    const { create, buildWorkspaceContext } = buildFactory();

    const context = await create(aThread());

    expect(context.workspaceContext).toBeUndefined();
    expect(buildWorkspaceContext).not.toHaveBeenCalled();
  });

  it('loads knowledge bases and skills only when a capability asks, then reuses them', async () => {
    const { create, findActiveSkills, findActiveKnowledgeBases } =
      buildFactory();

    const context = await create();
    expect(findActiveSkills).not.toHaveBeenCalled();
    expect(findActiveKnowledgeBases).not.toHaveBeenCalled();

    await Promise.all([context.knowledgeBases(), context.knowledgeBases()]);
    await Promise.all([context.skillCatalog(), context.skillCatalog()]);
    expect(findActiveKnowledgeBases).toHaveBeenCalledTimes(1);
    expect(findActiveSkills).toHaveBeenCalledTimes(1);
  });

  it('merges workspace and active knowledge bases by ID without attaching them to the thread', async () => {
    const workspaceKnowledgeBase: KnowledgeBaseSummary = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Satzungen',
    };
    const activeKnowledgeBase: KnowledgeBaseSummary = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      name: 'Municipal regulations',
    };
    const { create } = buildFactory({
      workspaceContext: aWorkspaceContext({
        runtimeKnowledgeBases: [
          {
            ...workspaceKnowledgeBase,
            description: null,
            documentCount: 3,
            isActive: true,
          },
        ],
      }),
      activeKnowledgeBases: [workspaceKnowledgeBase, activeKnowledgeBase],
    });

    const context = await create();

    expect(await context.knowledgeBases()).toEqual([
      expect.objectContaining(workspaceKnowledgeBase),
      activeKnowledgeBase,
    ]);
  });

  it('advertises personal, workspace and always-on skills by prefixed slug', async () => {
    const personalSkill = new PersonalSkill({
      name: 'User Skill',
      shortDescription: 'Activated by the user',
      instructions: 'Use user context',
      userId: TEST_USER_ID,
    });
    const workspaceSkill = aWorkspaceSkill(
      'Project Skill',
      'Assigned to the project',
    );
    const { create } = buildFactory({
      activeSkills: [personalSkill],
      workspaceContext: aWorkspaceContext({
        skills: [{ skill: workspaceSkill, isActive: true, isPinned: false }],
      }),
      templates: () =>
        Promise.resolve([
          { name: 'Data Analysis', shortDescription: 'Analyze datasets' },
        ]),
    });

    const catalog = await (await create()).skillCatalog();

    expect(catalog.entries).toEqual([
      { slug: 'user__user-skill', description: 'Activated by the user' },
      {
        slug: 'workspace__project-skill',
        description: 'Assigned to the project',
      },
      { slug: 'system__data-analysis', description: 'Analyze datasets' },
    ]);
    expect(catalog.slugMap.get('workspace__project-skill')).toBe(
      'Project Skill',
    );
    expect(catalog.editableSkillIds).toEqual(
      new Map([
        ['user__user-skill', personalSkill.id],
        ['workspace__project-skill', workspaceSkill.id],
      ]),
    );
  });

  it('keeps editable skill IDs aligned with the first advertised slug on collisions', async () => {
    const firstSkill = aWorkspaceSkill('Budget Review', 'First skill');
    const collidingSkill = aWorkspaceSkill('Budget-Review', 'Colliding skill');
    const { create } = buildFactory({
      workspaceContext: aWorkspaceContext({
        skills: [firstSkill, collidingSkill].map((skill) => ({
          skill,
          isActive: true,
          isPinned: false,
        })),
      }),
    });

    const catalog = await (await create()).skillCatalog();

    expect(catalog.editableSkillIds).toEqual(
      new Map([['workspace__budget-review', firstSkill.id]]),
    );
  });

  it('continues without always-on skills when templates cannot be loaded', async () => {
    const logger = createLoggerMock();
    const { create } = buildFactory({
      templates: () => Promise.reject(new Error('templates unavailable')),
    });

    const catalog = await (await create()).skillCatalog();

    expect(catalog.entries).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      { error: 'templates unavailable' },
      'Failed to fetch always-on templates, continuing without them',
    );
  });
});
