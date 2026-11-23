import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

@Injectable()
export class EmailCalendarCapability implements RunCapability {
  readonly id = 'email_calendar';
  readonly description =
    'Draft an email or a calendar event that the user reviews and sends from their own mail program. Load it when the user asks to write, answer or send an email or to put an appointment into their calendar (E-Mail, Mail schreiben, antworten, Termin, Einladung, Kalender).';

  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.SEND_EMAIL,
      ToolType.CREATE_CALENDAR_EVENT,
    ]);
    return { tools };
  }
}
