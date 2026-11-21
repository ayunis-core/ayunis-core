import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  anAssemblyState,
  aThread,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import { OnboardingCapability } from './onboarding.capability';

describe('OnboardingCapability', () => {
  const profileChat = aThread({
    origin: {
      kind: ThreadOriginKind.ONBOARDING,
      stage: OnboardingStage.PROFILE,
    },
  });
  const firstSkillChat = aThread({
    origin: {
      kind: ThreadOriginKind.ONBOARDING,
      stage: OnboardingStage.FIRST_SKILL,
    },
  });
  const withMemory = { memory: true, chatHistory: false };
  const withoutMemory = { memory: false, chatHistory: false };

  const withSkillCreation = anAssemblyState([ToolType.CREATE_SKILL]);
  const withoutSkillCreation = anAssemblyState();

  function capability(options: { memoryEnabled?: boolean } = {}) {
    const onboarding = new OnboardingCapability({
      get: () => options.memoryEnabled ?? true,
    } as never);
    return {
      contribute: (
        context: Parameters<OnboardingCapability['contribute']>[0],
        state = withSkillCreation,
      ) => onboarding.contribute(context, state),
    };
  }

  it('tells the model to get to know the user, save it to memory and then lead into skills in a profile chat', () => {
    const contribution = capability().contribute(
      aCapabilityContext({ thread: profileChat, personalContext: withMemory }),
    );

    expect(toolNames(contribution)).toEqual([]);
    const [section] = sectionsIn(contribution, PromptSlot.RESOURCES);
    expect(section).toMatch(/^<onboarding>\n[\s\S]*<\/onboarding>$/);
    expect(section).toMatch(/get to know/);
    expect(section).toMatch(/"personal" and "preferences" with set_memory/);
    expect(section).toMatch(/<user_instructions>[\s\S]*still accurate/);
    expect(section).toMatch(/create_skill/);
  });

  it('keeps a profile chat to the profile when the user may not create skills', () => {
    const [section] = sectionsIn(
      capability().contribute(
        aCapabilityContext({
          thread: profileChat,
          personalContext: withMemory,
        }),
        withoutSkillCreation,
      ),
      PromptSlot.RESOURCES,
    );

    expect(section).toMatch(/"personal" and "preferences" with set_memory/);
    expect(section).not.toMatch(/skill/i);
  });

  it('gives a first-skill chat no instructions when the user may not create skills', () => {
    expect(
      capability().contribute(
        aCapabilityContext({
          thread: firstSkillChat,
          personalContext: withMemory,
        }),
        withoutSkillCreation,
      ),
    ).toEqual({});
  });

  it.each([
    ['memory is unavailable to the run', withoutMemory, true],
    ['the model cannot use tools to save it', withMemory, false],
  ])(
    'gives a profile chat no instructions when %s',
    (_, personalContext, canUseTools) => {
      expect(
        capability().contribute(
          aCapabilityContext({
            thread: profileChat,
            personalContext,
            canUseTools,
          }),
        ),
      ).toEqual({});
    },
  );

  it('tells the model to create skills with the user in a first-skill chat, without a one-skill limit', () => {
    const contribution = capability().contribute(
      aCapabilityContext({
        thread: firstSkillChat,
        personalContext: withoutMemory,
      }),
    );

    expect(toolNames(contribution)).toEqual([]);
    const [section] = sectionsIn(contribution, PromptSlot.RESOURCES);
    expect(section).toMatch(/^<onboarding>\n[\s\S]*<\/onboarding>$/);
    expect(section).toMatch(/create_skill/);
    expect(section).not.toMatch(/exactly one/);
  });

  it('gives a first-skill chat no instructions when the model cannot use tools', () => {
    expect(
      capability().contribute(
        aCapabilityContext({ thread: firstSkillChat, canUseTools: false }),
      ),
    ).toEqual({});
  });

  it.each([
    ['profile', profileChat],
    ['first-skill', firstSkillChat],
  ])('gives a %s chat no instructions with memory turned off', (_, thread) => {
    expect(
      capability({ memoryEnabled: false }).contribute(
        aCapabilityContext({ thread, personalContext: withMemory }),
      ),
    ).toEqual({});
  });

  it.each([
    ['an ordinary chat', aThread()],
    [
      'a routine thread',
      aThread({ origin: { kind: ThreadOriginKind.ROUTINE, routineId: null } }),
    ],
    [
      'a chat about a notification',
      aThread({
        origin: { kind: ThreadOriginKind.NOTIFICATION, notificationId: null },
      }),
    ],
  ])('adds nothing to %s', (_, thread) => {
    expect(
      capability().contribute(
        aCapabilityContext({ thread, personalContext: withMemory }),
      ),
    ).toEqual({});
  });
});
