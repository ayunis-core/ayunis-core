import type { Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { buildMemorySection } from './memory-prompt-section';

export const MEMORY_NUDGE_INTERVAL = 5;

const MEMORY_NUDGE_TEXT = `Memory check-in: compare what you remember about this user with this conversation. If something durable about who they are or how they want to be helped is missing, outdated or wrong, update it now with set_memory and note in one sentence what you changed. If memory is already accurate, say nothing about it and simply continue.`;

/**
 * What the assistant remembers about the user: `get_memory`/`set_memory`, the
 * `<memory>` block at the end of the custom instructions, and a reminder on
 * every fifth user message. Only runs whose personal context allows memory
 * (`PersonalContextAccessService`) get any of it.
 */
@Injectable()
export class MemoryCapability implements RunCapability {
  readonly id = 'memory';
  readonly description = 'Read and update what you remember about the user.';

  private readonly logger = new Logger(MemoryCapability.name);

  constructor(
    private readonly findUserMemoryUseCase: FindUserMemoryUseCase,
    private readonly assembleToolUseCase: AssembleToolUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.personalContext.memory) return {};
    const toolsAvailable = context.model.canUseTools;
    const entries = await this.loadMemory();
    const section = buildMemorySection({ entries, toolsAvailable });
    const sections = section
      ? [{ slot: PromptSlot.CUSTOM_INSTRUCTIONS, content: section }]
      : [];
    if (!toolsAvailable) return { sections };
    return {
      tools: await assembleTools(this.assembleToolUseCase, [
        ToolType.GET_MEMORY,
        ToolType.SET_MEMORY,
      ]),
      sections,
      hooks: [() => createMemoryNudgeHook(context.thread)],
    };
  }

  /** A run without memory beats a failed chat. */
  private async loadMemory(): Promise<MemoryEntry[]> {
    try {
      return await this.findUserMemoryUseCase.execute();
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to load user memory, continuing without it',
      );
      return [];
    }
  }
}

/**
 * Appends the reminder as a system message to the model calls of the run's
 * first turn. Before-call changes are call-local, so it is never persisted or
 * shown. The run's user message joins the thread after assembly, so the
 * decision waits for the first model call.
 */
export function createMemoryNudgeHook(thread: Thread): Hook {
  let nudge: boolean | undefined;
  return {
    name: 'ayunis-memory-nudge',
    inheritToChildRuns: false,
    beforeModelCall: (ctx) => {
      if (ctx.turn !== 1) return;
      nudge ??= shouldNudgeMemory(thread.messages);
      if (!nudge) return;
      ctx.transformMessages((messages) => [
        ...messages,
        {
          role: 'system',
          content: [{ type: 'text', text: MEMORY_NUDGE_TEXT }],
        },
      ]);
    },
  };
}

/**
 * The run answers a user message, and it is a multiple of the interval. A run
 * continued by a tool result ends with that result, so the same user message
 * never nudges twice.
 */
export function shouldNudgeMemory(messages: readonly Message[]): boolean {
  if (!(messages.at(-1) instanceof UserMessage)) return false;
  const userMessages = messages.filter(
    (message) => message instanceof UserMessage,
  ).length;
  return userMessages % MEMORY_NUDGE_INTERVAL === 0;
}
