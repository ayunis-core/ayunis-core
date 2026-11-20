import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from 'src/config/features.config';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityAssemblyState,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * What an onboarding chat is for, by its stage. It brings no tools: a profile
 * chat writes memory through `MemoryCapability`, skills are created through
 * `SkillsCapability`, so each stage only applies while the run actually has
 * those tools. It reads the tools contributed before it, so it must come after
 * the skills capability.
 */
@Injectable()
export class OnboardingCapability implements RunCapability {
  constructor(private readonly configService: ConfigService) {}

  contribute(
    context: RunCapabilityContext,
    state: CapabilityAssemblyState,
  ): CapabilityContribution {
    const { origin } = context.thread;
    if (origin.kind !== ThreadOriginKind.ONBOARDING || !this.isEnabled()) {
      return {};
    }
    const canCreateSkills = state.reservedToolNames.has(ToolType.CREATE_SKILL);
    const instructions = instructionsFor(
      origin.stage,
      context,
      canCreateSkills,
    );
    if (!instructions) return {};
    return {
      sections: [{ slot: PromptSlot.RESOURCES, content: instructions }],
    };
  }

  private isEnabled(): boolean {
    return Boolean(
      this.configService.get<boolean>(`features.${FeatureFlag.Memory}`),
    );
  }
}

function instructionsFor(
  stage: OnboardingStage,
  context: RunCapabilityContext,
  canCreateSkills: boolean,
): string | null {
  if (!context.model.canUseTools) return null;
  switch (stage) {
    case OnboardingStage.PROFILE:
      return context.personalContext.memory
        ? profileInstructions(canCreateSkills)
        : null;
    case OnboardingStage.FIRST_SKILL:
      return canCreateSkills ? FIRST_SKILL_INSTRUCTIONS : null;
  }
}

function profileInstructions(withSkills: boolean): string {
  const intro = withSkills
    ? `${PROFILE_INTRO} ${PROFILE_SKILLS_INTRO}`
    : PROFILE_INTRO;
  const steps = withSkills
    ? `${PROFILE_STEPS}\n${PROFILE_SKILL_STEPS}`
    : PROFILE_STEPS;
  return `<onboarding>\n${intro}\n\n${steps}\n</onboarding>`;
}

const SKILL_BUILDING = `- Draft each skill together with the user: a name, a short description that says when the skill should be used, and the instructions to follow while it is active. Show the draft and refine it until the user is happy with it, then create it with create_skill.
- create_skill shows the user a card on which they confirm the creation, and your reply ends with the call. So write the rest into the same reply, before the call: ask them to confirm on the card, then explain how to use the skill in a chat. While it is active, Ayunis Core uses it on its own whenever a request matches its description, so in a new chat they only have to describe the task. They can also pin it on the Skills page to start it with one click from the new chat page.`;

const PROFILE_INTRO = `The user is new to Ayunis Core and started this chat so that you get to know them. What you learn here goes into your memory, so every later chat starts from it.`;

const PROFILE_SKILLS_INTRO = `What they tell you about their work is also the best starting point for their first skills.`;

const PROFILE_STEPS = `- Find out who they are and what they do: their role, department and organization, their responsibilities and the tasks that recur in their work. Also find out how they want you to serve them: tone, form of address, level of detail and preferred output formats.
- Keep it a conversation, not a questionnaire: ask a few questions at a time, react to the answers and follow up where it matters. Open with a short welcome and your first questions.
- As soon as you know enough, write "personal" and "preferences" with set_memory, then confirm in a sentence or two what you saved so the user can correct it. Update both as you learn more in this chat.
- If <user_instructions> are present, the user wrote them earlier. Treat them as what you already know about the user: sum up briefly what they say and check with the user whether it is still accurate instead of asking everything from scratch.
- Build on what your <memory> already holds instead of asking for it again.`;

const PROFILE_SKILL_STEPS = `- Once the profile is saved, move on to skills: pick the most important of the recurring tasks they mentioned, suggest a concrete skill for it and say in a sentence what it would save them. If they are up for it, build it with them as described below, and offer the next one afterwards for as long as they want. If they would rather stop, close the chat warmly.
${SKILL_BUILDING}`;

const FIRST_SKILL_INSTRUCTIONS = `<onboarding>
The user started this chat to set up skills for their work. You already know who they are from your <memory>, so don't get to know them again. A skill holds the instructions for a recurring task, so the user does not have to explain the task again in every chat.

- From what you remember, pick the most important task that recurs in their work, suggest a concrete skill for it and say in a sentence why it would help. If nothing fits, or they would rather have something else, ask which tasks they do again and again.
- Once a skill is created, offer the next one for another important task, for as long as the user wants. If they would rather stop, close the chat warmly.
${SKILL_BUILDING}
</onboarding>`;
