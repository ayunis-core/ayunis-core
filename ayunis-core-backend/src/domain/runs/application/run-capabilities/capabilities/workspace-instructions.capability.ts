import { Injectable } from '@nestjs/common';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

@Injectable()
export class WorkspaceInstructionsCapability implements RunCapability {
  contribute(context: RunCapabilityContext): CapabilityContribution {
    const instruction = context.workspaceContext?.instruction;
    if (!instruction) return {};
    return {
      sections: [
        {
          slot: PromptSlot.RESOURCES,
          content: `<workspace_instructions>\nThese instructions apply to every chat in this workspace.\n\n${escapeXml(instruction)}\n</workspace_instructions>`,
        },
      ],
    };
  }
}
