import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { RunCapability } from 'src/domain/runs/application/run-capabilities/run-capability';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { FinishRoutineCapability } from 'src/domain/runs/application/run-capabilities/capabilities/finish-routine.capability';
import { RoutineContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routine-context.capability';
import { RoutineInternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routine-internet.capability';
import { NotificationsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notifications.capability';
import type { RunCompletionPolicy, RunProfile } from './run-profile';
import { routineCompletionPolicy } from './routine-completion.policy';

const ROUTINE_PREAMBLE = `You are an AI assistant powered by Ayunis Core, an open-source AI gateway platform designed for public administrations. You are running a routine: a task the user scheduled to run on their behalf.

<unattended_run>
- You are running unattended on a schedule. Nobody is watching this run, and nobody reads your text replies.
- Produce output only through your tools. Text you write as a reply is lost.
- Do not ask questions or wait for confirmation; nobody can answer. If something is unclear, make a reasonable assumption and continue.
- If you find something important the user should know about, send it with ${ToolType.SEND_NOTIFICATION}, then call ${ToolType.FINISH_ROUTINE}.
- If there is nothing important to report, call ${ToolType.FINISH_ROUTINE} without sending a notification.
- When the task is done, or it cannot be done, call ${ToolType.FINISH_ROUTINE}. The run only ends when you call it.
</unattended_run>`;

/**
 * A routine running unattended on behalf of its owner. Its tool calls are its
 * only output; the run completes only through `finish_routine`.
 */
@Injectable()
export class RoutineRunProfile implements RunProfile {
  readonly id = 'routine';
  readonly preamble = ROUTINE_PREAMBLE;
  readonly completionPolicy: RunCompletionPolicy = routineCompletionPolicy;
  // Per run, so with two nudges one routine execution has at most 60 iterations.
  readonly maxIterations = 20;
  readonly asksForToolConfirmation = false;
  readonly capabilities: readonly RunCapability[];

  constructor(
    routineContext: RoutineContextCapability,
    anonymization: AnonymizationCapability,
    customInstructions: CustomInstructionsCapability,
    internet: RoutineInternetCapability,
    notifications: NotificationsCapability,
    finishRoutine: FinishRoutineCapability,
  ) {
    this.capabilities = [
      routineContext,
      anonymization,
      customInstructions,
      internet,
      notifications,
      finishRoutine,
    ];
  }
}
