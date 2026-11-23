import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { FeatureFlag } from 'src/config/features.config';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { SendNotificationOrigin } from 'src/domain/tools/domain/tools/send-notification-tool.entity';
import {
  ThreadOriginKind,
  type ThreadOrigin,
} from 'src/domain/threads/domain/thread-origin';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import { routineOf } from 'src/domain/runs/application/run-capabilities/routine-of.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/** `send_notification`, a routine run's way to reach its owner's inbox. */
@Injectable()
export class NotificationsCapability implements RunCapability {
  readonly id = 'notifications';
  readonly description = "Send a notification to the routine owner's inbox.";

  constructor(
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly configService: ConfigService,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    routineOf(context);
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Routines}`)) {
      return {};
    }
    const tools = await assembleTools(
      this.assembleToolUseCase,
      [ToolType.SEND_NOTIFICATION],
      new SendNotificationOrigin(routineIdOf(context.thread.origin)),
    );
    return { tools };
  }
}

function routineIdOf(origin: ThreadOrigin): UUID | null {
  return origin.kind === ThreadOriginKind.ROUTINE ? origin.routineId : null;
}
