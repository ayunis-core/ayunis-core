import { Injectable } from '@nestjs/common';
import { GetOrgSystemPromptUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-system-prompt/get-org-system-prompt.use-case';
import { GetUserSystemPromptUseCase } from 'src/domain/chat-settings/application/use-cases/get-user-system-prompt/get-user-system-prompt.use-case';
import {
  PromptSlot,
  type CapabilityContribution,
  type PromptSection,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

@Injectable()
export class CustomInstructionsCapability implements RunCapability {
  constructor(
    private readonly getOrgSystemPromptUseCase: GetOrgSystemPromptUseCase,
    private readonly getUserSystemPromptUseCase: GetUserSystemPromptUseCase,
  ) {}

  async contribute(): Promise<CapabilityContribution> {
    const orgSystemPrompt = (await this.getOrgSystemPromptUseCase.execute())
      ?.systemPrompt;
    const userSystemPrompt = (await this.getUserSystemPromptUseCase.execute())
      ?.systemPrompt;
    const sections: PromptSection[] = [];
    if (orgSystemPrompt) {
      sections.push({
        slot: PromptSlot.CUSTOM_INSTRUCTIONS,
        content: `
<organization_instructions>
The following instructions were set by the user's organization administrator and apply to all members of the organization:
${orgSystemPrompt}
</organization_instructions>`,
      });
    }
    if (userSystemPrompt) {
      sections.push({
        slot: PromptSlot.CUSTOM_INSTRUCTIONS,
        content: `
<user_instructions>
${userSystemPrompt}
</user_instructions>`,
      });
    }
    return { sections };
  }
}
