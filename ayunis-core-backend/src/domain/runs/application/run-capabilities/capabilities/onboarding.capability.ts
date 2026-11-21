import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from 'src/config/features.config';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * What an onboarding chat is for, by its stage. It brings no tools: a profile
 * chat writes memory through `MemoryCapability`, a first-skill chat creates
 * the skill through `SkillsCapability`, so each stage only applies while the
 * run actually has those tools.
 */
@Injectable()
export class OnboardingCapability implements RunCapability {
  constructor(private readonly configService: ConfigService) {}

  contribute(context: RunCapabilityContext): CapabilityContribution {
    const { origin } = context.thread;
    if (origin.kind !== ThreadOriginKind.ONBOARDING || !this.isEnabled()) {
      return {};
    }
    const instructions = instructionsFor(origin.stage, context);
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
): string | null {
  if (!context.model.canUseTools) return null;
  switch (stage) {
    case OnboardingStage.PROFILE:
      return context.personalContext.memory ? PROFILE_INSTRUCTIONS : null;
    case OnboardingStage.FIRST_SKILL:
      return FIRST_SKILL_INSTRUCTIONS;
  }
}

const PROFILE_INSTRUCTIONS = `<onboarding>
The user is new to Ayunis Core and started this chat so that you get to know them. What you learn here goes into your memory, so every later chat starts from it.

- Find out who they are and what they do: their role, department and organization, their responsibilities and the tasks that recur in their work. Also find out how they want you to serve them: tone, form of address, level of detail and preferred output formats.
- Keep it a conversation, not a questionnaire: ask a few questions at a time, react to the answers and follow up where it matters. Open with a short welcome and your first questions.
- As soon as you know enough, write "personal" and "preferences" with set_memory, then confirm in a sentence or two what you saved so the user can correct it. Update both as you learn more in this chat.
- If <user_instructions> are present, the user wrote them earlier. Treat them as what you already know about the user: sum up briefly what they say and check with the user whether it is still accurate instead of asking everything from scratch.
- Build on what your <memory> already holds instead of asking for it again.
</onboarding>`;

const FIRST_SKILL_INSTRUCTIONS = `<onboarding>
The user started this chat to create their first skill with you. A skill holds the instructions for a recurring task, so the user does not have to explain the task again in every chat.

- Use what you remember about the user to suggest one concrete skill for a task that recurs in their work, and say in a sentence why it would help. If nothing fits, or they would rather have something else, ask which task they do again and again.
- Draft it together with the user: a name, a short description that says when the skill should be used, and the instructions to follow while it is active. Show the draft and refine it until the user is happy with it.
- Once the user agrees, create it with create_skill. Create exactly one skill in this chat; if the user wants more, tell them they can create further skills the same way later.
- create_skill shows the user a card on which they confirm the creation, and your reply ends with the call. So write the rest into the same reply, before the call: ask them to confirm on the card, then explain how to use the skill in a chat. While it is active, Ayunis Core uses it on its own whenever a request matches its description, so in a new chat they only have to describe the task. They can also pin it on the Skills page to start it with one click from the new chat page.
</onboarding>`;
