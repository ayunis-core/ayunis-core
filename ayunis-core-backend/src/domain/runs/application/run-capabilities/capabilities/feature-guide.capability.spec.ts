import { FeatureFlag } from 'src/config/features.config';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  aThread,
  sectionsIn,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { GuideFeature } from 'src/domain/threads/domain/guide-feature.enum';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { FeatureGuideCapability } from './feature-guide.capability';

describe('FeatureGuideCapability', () => {
  const userContext = {
    get: (key: string) =>
      ({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
      })[key],
  };

  function capability(
    options: { disabledFlags?: FeatureFlag[]; mayCreate?: boolean } = {},
  ) {
    const disabled = new Set(options.disabledFlags ?? []);
    return new FeatureGuideCapability(
      {
        get: (key: string) =>
          !disabled.has(key.replace('features.', '') as FeatureFlag),
      } as never,
      userContext as never,
      {
        execute: jest.fn().mockResolvedValue(options.mayCreate ?? true),
      } as never,
    );
  }

  function guideChat(feature: GuideFeature) {
    return aCapabilityContext({
      thread: aThread({
        origin: { kind: ThreadOriginKind.FEATURE_GUIDE, feature },
      }),
    });
  }

  function tools(...names: ToolType[]) {
    return { reservedToolNames: new Set<string>(names) };
  }

  async function guideFor(
    feature: GuideFeature,
    options: Parameters<typeof capability>[0] = {},
    state = tools(),
  ): Promise<string> {
    const contribution = await capability(options).contribute(
      guideChat(feature),
      state,
    );
    const [section] = sectionsIn(contribution, PromptSlot.RESOURCES);
    return section;
  }

  it('adds nothing to a chat that was not started from an empty feature page', async () => {
    expect(
      await capability().contribute(aCapabilityContext(), tools()),
    ).toEqual({});
  });

  it.each([
    [
      GuideFeature.KNOWLEDGE_BASES,
      '"Knowledge" / "Wissen"',
      'knowledge-collections/',
    ],
    [GuideFeature.SKILLS, '"Skills" / "Fähigkeiten"', 'skills/'],
    [
      GuideFeature.WORKSPACES,
      '"Workspaces" / "Arbeitsbereiche"',
      'workspaces/',
    ],
  ])(
    'explains %s from its page and links its help center article in both languages',
    async (feature, page, helpPath) => {
      const section = await guideFor(feature);

      expect(section).toMatch(/^<feature_guide>\n[\s\S]*<\/feature_guide>$/);
      expect(section).toContain(`the empty ${page} page`);
      expect(section).toContain(`https://help.ayunis.com/de/${helpPath}`);
      expect(section).toContain(`https://help.ayunis.com/en/${helpPath}`);
      expect(section).toMatch(/ask what they would like to use/);
    },
  );

  it.each([
    [GuideFeature.ROUTINES, '"Routines" / "Routinen"'],
    [GuideFeature.RECORDINGS, '"Meetings" / "Besprechungen"'],
  ])(
    'explains %s without a help center link, which has no article',
    async (feature, page) => {
      const section = await guideFor(feature);

      expect(section).toContain(`the empty ${page} page`);
      expect(section).not.toContain('help.ayunis.com');
    },
  );

  it.each([
    [GuideFeature.ROUTINES, FeatureFlag.Routines],
    [GuideFeature.RECORDINGS, FeatureFlag.Recordings],
  ])(
    'adds nothing for %s while its feature is turned off',
    async (feature, flag) => {
      expect(
        await capability({ disabledFlags: [flag] }).contribute(
          guideChat(feature),
          tools(ToolType.CREATE_ROUTINE),
        ),
      ).toEqual({});
    },
  );

  it('offers to build a skill and to search the marketplace when the run has those tools', async () => {
    const section = await guideFor(
      GuideFeature.SKILLS,
      {},
      tools(ToolType.CREATE_SKILL, ToolType.MARKETPLACE_SEARCH),
    );

    expect(section).toContain(ToolType.CREATE_SKILL);
    expect(section).toContain(ToolType.MARKETPLACE_SEARCH);
  });

  it('offers to set up a routine when the run has create_routine', async () => {
    const section = await guideFor(
      GuideFeature.ROUTINES,
      {},
      tools(ToolType.CREATE_ROUTINE),
    );

    expect(section).toContain(ToolType.CREATE_ROUTINE);
  });

  it('points to the page instead of a tool the run does not have', async () => {
    const section = await guideFor(GuideFeature.SKILLS);

    expect(section).not.toContain(ToolType.CREATE_SKILL);
    expect(section).toMatch(
      /<next_step>\n[^<]*point them to "Add Skill" \/ "Fähigkeit hinzufügen"/,
    );
  });

  it('sends a user whose role may not create skills to an administrator instead of pointing to the page', async () => {
    const section = await guideFor(GuideFeature.SKILLS, { mayCreate: false });

    expect(section).not.toContain(ToolType.CREATE_SKILL);
    expect(section).not.toMatch(/point them to "Add Skill"/);
    expect(section).toMatch(/<next_step>\n[^<]*ask an administrator/);
  });

  it('still offers the marketplace to a user who may install but not create skills', async () => {
    const section = await guideFor(
      GuideFeature.SKILLS,
      { mayCreate: false },
      tools(ToolType.MARKETPLACE_SEARCH),
    );

    expect(section).toContain(ToolType.MARKETPLACE_SEARCH);
    expect(section).toContain(ToolType.INSTALL_MARKETPLACE_SKILL);
    expect(section).toMatch(/ask an administrator/);
  });

  it('lets every user set up a workspace, which needs no permission', async () => {
    const section = await guideFor(GuideFeature.WORKSPACES, {
      mayCreate: false,
    });

    expect(section).not.toMatch(/administrator/);
    expect(section).toMatch(
      /<next_step>\n[^<]*"Add workspace" \/ "Arbeitsbereich hinzufügen"/,
    );
  });
});
