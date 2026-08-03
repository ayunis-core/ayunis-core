import type {
  Message,
  AssistantMessage,
  ThinkingMessageContent,
  ToolUseMessageContent,
  TextMessageContent,
} from '@/pages/chat/model/openapi';
import type {
  RenderUnit,
  AgentRunUnit,
  TimelineStep,
  StepStatus,
  ToolTimelineStep,
} from '../model/types';
import { isRichTool } from './tool-classification';

interface GroupingOptions {
  isStreaming: boolean;
  /** New user turn is pending outside `messages` (optimistic bubble only). */
  hasPendingUserTurn?: boolean;
}

export function groupMessagesIntoRuns(
  messages: readonly Message[],
  { isStreaming, hasPendingUserTurn = false }: GroupingOptions,
): RenderUnit[] {
  const toolResultsByToolId = indexToolResults(messages);
  const isStreamingCurrentMessages = isStreaming && !hasPendingUserTurn;
  const activeAssistantMessageIndex = isStreamingCurrentMessages
    ? findActiveAssistantMessageIndex(messages)
    : -1;
  const units: RenderUnit[] = [];
  let currentRun: AgentRunUnit | null = null;
  let pendingSkillSteps: TimelineStep[] = [];

  const closeRun = () => {
    if (currentRun) {
      units.push(currentRun);
      currentRun = null;
    }
  };

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message.role === 'user') {
      closeRun();
      units.push({ kind: 'user', key: message.id, message });
      pendingSkillSteps = collectSkillInstructionSteps(message);
      continue;
    }

    if (message.role === 'system') {
      closeRun();
      continue;
    }

    if (message.role === 'tool') {
      continue;
    }

    const run: AgentRunUnit = (currentRun ??= {
      kind: 'agent-run',
      key: `run-${message.id}`,
      blocks: [],
      isStreaming: false,
    });
    pendingSkillSteps.forEach((step) => appendActivityStep(run, step));
    pendingSkillSteps = [];

    appendAssistantMessage(run, message, {
      isActiveAssistantMessage: i === activeAssistantMessageIndex,
      toolResultsByToolId,
    });
  }

  closeRun();

  if (isStreamingCurrentMessages && units.length > 0) {
    const lastUnit = units[units.length - 1];
    if (lastUnit.kind === 'agent-run') {
      lastUnit.isStreaming = true;
    }
  }

  return units;
}

function findActiveAssistantMessageIndex(messages: readonly Message[]): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    const role = messages[index].role;
    if (role === 'assistant') return index;
    if (role === 'user' || role === 'system') return -1;
  }
  return -1;
}

function indexToolResults(
  messages: readonly Message[],
): Readonly<Record<string, string>> {
  const results: Record<string, string> = {};
  for (const message of messages) {
    if (message.role !== 'tool') continue;
    for (const content of message.content) {
      if (content.type === 'tool_result') {
        results[content.toolId] = content.result;
      }
    }
  }
  return results;
}

function collectSkillInstructionSteps(message: Message): TimelineStep[] {
  if (message.role !== 'user') return [];
  const steps: TimelineStep[] = [];
  message.content.forEach((block, index) => {
    if (block.type !== 'text') return;
    if (!('isSkillInstruction' in block) || !block.isSkillInstruction) return;
    steps.push({
      kind: 'skill_instruction',
      key: `${message.id}-skill-${index}`,
      text: block.text,
      status: 'done',
    });
  });
  return steps;
}

interface AppendOptions {
  isActiveAssistantMessage: boolean;
  toolResultsByToolId: Readonly<Record<string, string>>;
}

function getToolStatus(
  toolUse: ToolUseMessageContent,
  hasResult: boolean,
  isStreaming: boolean,
): StepStatus {
  if (toolUse.stream?.status === 'invalid') return 'error';
  return hasResult || !isStreaming ? 'done' : 'in_progress';
}

function appendAssistantMessage(
  run: AgentRunUnit,
  message: AssistantMessage,
  { isActiveAssistantMessage, toolResultsByToolId }: AppendOptions,
): void {
  const content = message.content;

  let pendingThinking: { transcript: string; key: string } | null = null;
  const flushThinking = (status: 'in_progress' | 'done') => {
    if (pendingThinking) {
      appendActivityStep(run, {
        kind: 'thinking',
        key: pendingThinking.key,
        transcript: pendingThinking.transcript,
        status,
      });
      pendingThinking = null;
    }
  };

  content.forEach((block, index) => {
    if (block.type === 'thinking') {
      const thinking = block as ThinkingMessageContent;
      if (pendingThinking) {
        pendingThinking.transcript = `${pendingThinking.transcript}\n${thinking.thinking}`;
      } else {
        pendingThinking = {
          transcript: thinking.thinking,
          key: `${message.id}-thinking-${index}`,
        };
      }
      return;
    }

    flushThinking('done');

    if (block.type === 'tool_use') {
      const toolUse = block as ToolUseMessageContent;
      const hasResult = toolUse.id in toolResultsByToolId;
      const result = hasResult ? toolResultsByToolId[toolUse.id] : undefined;
      const status = getToolStatus(
        toolUse,
        hasResult,
        isActiveAssistantMessage,
      );
      const step: ToolTimelineStep = {
        kind: 'tool',
        key: `${message.id}-tool-${toolUse.id}`,
        toolUse,
        result,
        status,
      };
      const isPendingTool =
        toolUse.name.length === 0 && toolUse.stream?.status === 'streaming';
      if (status !== 'error' && isPendingTool) {
        run.blocks.push({
          kind: 'pending-tool',
          key: step.key,
          step,
        });
      } else if (status !== 'error' && isRichTool(toolUse.name)) {
        run.blocks.push({
          kind: 'rich-tool',
          key: step.key,
          step,
        });
      } else {
        appendActivityStep(run, step);
      }
      return;
    }

    if (block.type === 'text') {
      run.blocks.push({
        kind: 'text',
        key: `${message.id}-text-${index}`,
        content: block as TextMessageContent,
      });
    }
  });

  flushThinking(isActiveAssistantMessage ? 'in_progress' : 'done');
}

function appendActivityStep(run: AgentRunUnit, step: TimelineStep): void {
  const lastBlock = run.blocks.at(-1);
  if (lastBlock?.kind === 'activity') {
    lastBlock.steps.push(step);
    return;
  }
  run.blocks.push({
    kind: 'activity',
    key: `activity-${step.key}`,
    steps: [step],
  });
}
