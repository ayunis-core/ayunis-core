import { Injectable } from '@nestjs/common';
import { getUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * The anonymization exception card, offered only to the org admins the
 * whitelist endpoint lets save it.
 */
@Injectable()
export class AnonymizationExceptionCapability implements RunCapability {
  constructor(
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly contextService: ContextService,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    if (getUserContext(this.contextService)?.role !== UserRole.ADMIN) {
      return {};
    }
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.ADD_ANONYMIZATION_EXCEPTION,
    ]);
    return { tools };
  }
}
