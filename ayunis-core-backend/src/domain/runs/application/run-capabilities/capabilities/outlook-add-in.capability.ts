import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

const OUTLOOK_TOOLS = [
  ToolType.OUTLOOK_READ_EMAIL,
  ToolType.OUTLOOK_READ_ATTACHMENT,
  ToolType.OUTLOOK_DRAFT_EMAIL,
  ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
  ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
] as const;

const OUTLOOK_INSTRUCTIONS = `<outlook_context>
The user is chatting with you in the Ayunis pane inside Microsoft Outlook, next to an email that is open there, either being read or being written. The outlook__ tools act on that email:

- ${ToolType.OUTLOOK_READ_EMAIL} reads it and ${ToolType.OUTLOOK_READ_ATTACHMENT} reads one of its attachments. Read the email before you summarize, answer or improve it; never guess its content.
- ${ToolType.OUTLOOK_DRAFT_EMAIL} puts your text into Outlook as a draft or reply, ${ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER} replaces the body of the email being written, and ${ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT} saves it to the Drafts folder.

Call one outlook__ tool at a time. Ayunis never sends email: the user reviews, edits and sends it in Outlook.
</outlook_context>`;

/**
 * The tools and prompt section of the Outlook add-in pane. The section goes
 * late in the prompt, after the platform information, so the prompt before it
 * is the web chat's.
 */
@Injectable()
export class OutlookAddInCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    return {
      tools: await assembleTools(this.assembleToolUseCase, OUTLOOK_TOOLS),
      sections: [{ slot: PromptSlot.POLICIES, content: OUTLOOK_INSTRUCTIONS }],
    };
  }
}
