import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  aThread,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
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

  function capability(options: { memoryEnabled?: boolean } = {}) {
    return new OnboardingCapability({
      get: () => options.memoryEnabled ?? true,
    } as never);
  }

  it('tells the model to get to know the user and save it to memory in a profile chat', () => {
    const contribution = capability().contribute(
      aCapabilityContext({ thread: profileChat, personalContext: withMemory }),
    );

    expect(toolNames(contribution)).toEqual([]);
    const [section] = sectionsIn(contribution, PromptSlot.RESOURCES);
    expect(section).toMatch(/^<onboarding>\n[\s\S]*<\/onboarding>$/);
    expect(section).toMatch(/get to know/);
    expect(section).toMatch(/"personal" and "preferences" with set_memory/);
    expect(section).toMatch(/<user_instructions>[\s\S]*still accurate/);
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

  it('tells the model to create exactly one skill with the user in a first-skill chat', () => {
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
    expect(section).toMatch(/exactly one skill/);
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
