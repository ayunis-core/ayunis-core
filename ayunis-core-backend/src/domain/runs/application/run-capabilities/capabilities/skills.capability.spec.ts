import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import type { SkillCatalog } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import {
  createSkillActivationHook,
  SkillsCapability,
} from './skills.capability';

const catalog: SkillCatalog = {
  slugMap: new Map([
    ['user__german-administrative-law', 'German Administrative Law'],
    ['system__data-analysis', 'Data Analysis'],
  ]),
  editableSkillIds: new Map([
    ['user__german-administrative-law', '77777777-7777-4777-8777-777777777777'],
  ]),
  entries: [
    {
      slug: 'user__german-administrative-law',
      description: 'Handles <special> "quoted" queries & more',
    },
    {
      slug: 'system__data-analysis',
      description: 'Analyze datasets and produce statistical summaries',
    },
  ],
};

describe('SkillsCapability', () => {
  const capability = new SkillsCapability(createAssembleToolUseCase());
  const withCatalog = (overrides: Partial<SkillCatalog> = {}) =>
    aCapabilityContext({
      skillCatalog: () => Promise.resolve({ ...catalog, ...overrides }),
    });

  it('offers skill creation, editing and activation for an advertised catalog', async () => {
    expect(toolNames(await capability.contribute(withCatalog()))).toEqual([
      ToolType.CREATE_SKILL,
      ToolType.EDIT_SKILL,
      ToolType.ACTIVATE_SKILL,
    ]);
  });

  it('offers only skill creation without advertised or editable skills', async () => {
    const contribution = await capability.contribute(aCapabilityContext());

    expect(toolNames(contribution)).toEqual([ToolType.CREATE_SKILL]);
    expect(sectionsIn(contribution, PromptSlot.RESOURCES)).toEqual([]);
  });

  it('lists the catalog by slug with escaped descriptions', async () => {
    const [section] = sectionsIn(
      await capability.contribute(withCatalog()),
      PromptSlot.RESOURCES,
    );

    expect(section).toContain('<available_skills>');
    expect(section).toContain('<name>user__german-administrative-law</name>');
    expect(section).toContain(
      '<description>Handles &lt;special&gt; &quot;quoted&quot; queries &amp; more</description>',
    );
    expect(section).toContain('<name>system__data-analysis</name>');
  });

  it('notes a quick-action skill as already activated, also without tool use', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({
        canUseTools: false,
        activatedSkillName: 'Legal Research',
      }),
    );

    expect(contribution.tools).toBeUndefined();
    expect(sectionsIn(contribution, PromptSlot.RUN_NOTES)).toEqual([
      expect.stringContaining(
        'Skill "Legal Research" has already been activated on this thread.',
      ),
    ]);
  });

  it('does not load the catalog when the model cannot use tools', async () => {
    const skillCatalog = jest.fn().mockResolvedValue(catalog);

    await capability.contribute(
      aCapabilityContext({ canUseTools: false, skillCatalog }),
    );

    expect(skillCatalog).not.toHaveBeenCalled();
  });
});

describe('createSkillActivationHook', () => {
  function toolCtx(name: string, isError = false) {
    return {
      toolCall: { id: 'call-1', name, input: {} },
      isError,
      setTools: jest.fn(),
      setInstructions: jest.fn(),
    };
  }

  it('does not inherit root thread state into child runs', () => {
    expect(
      createSkillActivationHook({ refresh: jest.fn() }).inheritToChildRuns,
    ).toBe(false);
  });

  it('refreshes the run after a successful activate_skill call', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const ctx = toolCtx('activate_skill');

    await createSkillActivationHook({ refresh }).afterToolCall!(ctx as never);

    expect(refresh).toHaveBeenCalledWith(ctx);
  });

  it.each([
    ['other tool calls', toolCtx('internet_search')],
    ['a failed activation', toolCtx('activate_skill', true)],
  ])('ignores %s', async (_label, ctx) => {
    const refresh = jest.fn();

    await createSkillActivationHook({ refresh }).afterToolCall!(ctx as never);

    expect(refresh).not.toHaveBeenCalled();
  });
});
