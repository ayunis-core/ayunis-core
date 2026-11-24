import type {
  GetThreadResponseDto,
  AssistantMessageResponseDto as AssistantMessage,
  ThinkingMessageContentResponseDto,
  TextMessageContentResponseDto,
  ToolResultMessageContentResponseDto as ToolResultMessageContent,
  ToolUseMessageContentResponseDto as ToolUseMessageContent,
} from '@ayunis/api-client/schemas';
import type {
  RenderUnit,
  AgentRunUnit,
  TimelineStep,
  StepStatus,
  ToolTimelineStep,
  RichToolRunBlock,
} from './types';
import {
  getArtifactToolFamily,
  getArtifactToolTarget,
} from './artifact-tool-target';
import { EMPTY_TOOL_CARDS, type ToolCards } from './tool-card-types';

type Message = GetThreadResponseDto['messages'][number];

export interface GroupingOptions {
  isStreaming: boolean;
  /** New user turn is pending outside `messages` (optimistic bubble only). */
  hasPendingUserTurn?: boolean;
  toolCards?: ToolCards;
}

export function groupMessagesIntoRuns(
  messages: readonly Message[],
  {
    isStreaming,
    hasPendingUserTurn = false,
    toolCards = EMPTY_TOOL_CARDS,
  }: GroupingOptions,
): RenderUnit[] {
  const isStreamingCurrentMessages = isStreaming && !hasPendingUserTurn;
  const activeIndex = isStreamingCurrentMessages
    ? findActiveAssistantMessageIndex(messages)
    : -1;
  const units = buildRenderUnits(messages, toolCards, activeIndex);
  const last = units.at(-1);
  if (isStreamingCurrentMessages && last?.kind === 'agent-run')
    last.isStreaming = true;
  return units;
}

function buildRenderUnits(
  messages: readonly Message[],
  toolCards: ToolCards,
  activeIndex: number,
): RenderUnit[] {
  const toolResultsByToolId = indexToolResults(messages);
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
      isActiveAssistantMessage: i === activeIndex,
      toolResultsByToolId,
      toolCards,
    });
  }

  closeRun();

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
): ReadonlyMap<string, ToolResultMessageContent> {
  const results = new Map<string, ToolResultMessageContent>();
  for (const message of messages) {
    if (message.role !== 'tool') continue;
    for (const content of message.content) {
      if (content.type === 'tool_result') {
        results.set(content.toolId, content);
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
  toolCards: ToolCards;
  isActiveAssistantMessage: boolean;
  toolResultsByToolId: ReadonlyMap<string, ToolResultMessageContent>;
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
  options: AppendOptions,
): void {
  const callOptions = {
    ...options,
    awaitsConfirmation: hasCallAwaitingConfirmation(
      message,
      options.toolResultsByToolId,
    ),
  };

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

  message.content.forEach((block, index) => {
    if (block.type === 'thinking') {
      const { thinking } = block as ThinkingMessageContentResponseDto;
      if (pendingThinking) {
        pendingThinking.transcript = `${pendingThinking.transcript}\n${thinking}`;
      } else {
        pendingThinking = {
          transcript: thinking,
          key: `${message.id}-thinking-${index}`,
        };
      }
      return;
    }

    flushThinking('done');

    appendAssistantContent(run, block, message.id, index, callOptions);
  });

  flushThinking(options.isActiveAssistantMessage ? 'in_progress' : 'done');
}

type ToolCallOptions = AppendOptions & { awaitsConfirmation: boolean };

function appendAssistantContent(
  run: AgentRunUnit,
  block: AssistantMessage['content'][number],
  messageId: string,
  index: number,
  callOptions: ToolCallOptions,
): void {
  if (block.type === 'tool_use') {
    appendToolCall(run, messageId, block as ToolUseMessageContent, callOptions);
    return;
  }

  if (block.type === 'text') {
    run.blocks.push({
      kind: 'text',
      key: `${messageId}-text-${index}`,
      content: block as TextMessageContentResponseDto,
    });
  }
}

function appendToolCall(
  run: AgentRunUnit,
  messageId: string,
  toolUse: ToolUseMessageContent,
  {
    awaitsConfirmation,
    isActiveAssistantMessage,
    toolResultsByToolId,
    toolCards,
  }: ToolCallOptions,
): void {
  const result = toolResultsByToolId.get(toolUse.id);
  const status = getToolStatus(
    toolUse,
    result !== undefined,
    isActiveAssistantMessage,
  );
  // The turn's other calls run only once its confirmations are decided.
  if (
    awaitsConfirmation &&
    !toolUse.requiresConfirmation &&
    result === undefined &&
    status !== 'in_progress'
  )
    return;
  appendToolStep(run, toolCards, {
    kind: 'tool',
    key: `${messageId}-tool-${toolUse.id}`,
    toolUse,
    result: result?.result,
    decision: result?.decision,
    status,
  });
}

function hasCallAwaitingConfirmation(
  message: AssistantMessage,
  toolResultsByToolId: ReadonlyMap<string, ToolResultMessageContent>,
): boolean {
  return message.content.some((block) => {
    if (block.type !== 'tool_use') return false;
    const toolUse = block as ToolUseMessageContent;
    return (
      toolUse.requiresConfirmation === true &&
      !toolResultsByToolId.has(toolUse.id)
    );
  });
}

const FINISH_ROUTINE_TOOL = 'finish_routine';

function appendToolStep(
  run: AgentRunUnit,
  toolCards: ToolCards,
  step: ToolTimelineStep,
): void {
  const { toolUse, status } = step;
  if (status === 'error') {
    appendActivityStep(run, step);
    return;
  }
  if (toolUse.name === FINISH_ROUTINE_TOOL) {
    run.blocks.push({ kind: 'routine-finished', key: step.key });
    return;
  }
  const isPendingTool =
    toolUse.name.length === 0 && toolUse.stream?.status === 'streaming';
  if (isPendingTool) {
    run.blocks.push({
      kind: 'pending-tool',
      key: step.key,
      step,
    });
    return;
  }
  if (toolCards.has(toolUse.name) || toolUse.requiresConfirmation) {
    const mergeTarget = findSameArtifactRichBlock(run, toolCards, toolUse);
    if (mergeTarget) {
      mergeTarget.steps.push(step);
    } else {
      run.blocks.push({
        kind: 'rich-tool',
        key: step.key,
        steps: [step],
      });
    }
    return;
  }
  appendActivityStep(run, step);
}

/**
 * Repeated operations on the same artifact (e.g. an edit/read/edit loop) share
 * one rich-tool block, so the chat shows a single widget with the latest state
 * instead of one widget per call (AYC-476). The backward search deliberately
 * skips activity blocks because thinking and unrelated tool calls should not
 * re-split that widget. Assistant prose and another artifact's widget do.
 *
 * An artifact call whose arguments are still streaming has no parseable
 * artifact_id yet, so it merges optimistically into a preceding block of the
 * same family. Once the arguments parse, the next grouping pass re-evaluates:
 * the common same-artifact case stays merged, a different artifact splits out
 * into its own widget.
 */
function findSameArtifactRichBlock(
  run: AgentRunUnit,
  toolCards: ToolCards,
  toolUse: ToolUseMessageContent,
): RichToolRunBlock | null {
  const criteria = getMergeCriteria(toolCards, toolUse);
  if (!criteria) return null;
  const block = findTrailingRichBlock(run);
  const lastStep = block?.steps.at(-1);
  const previous = lastStep
    ? getArtifactToolTarget(toolCards, lastStep.toolUse)
    : null;
  if (previous?.family !== criteria.family) return null;
  const sameArtifact =
    criteria.artifactId === null || previous.artifactId === criteria.artifactId;
  return sameArtifact ? block : null;
}

interface MergeCriteria {
  family: string;
  /** null while the call's arguments are still streaming: match family only. */
  artifactId: string | null;
}

function getMergeCriteria(
  toolCards: ToolCards,
  toolUse: ToolUseMessageContent,
): MergeCriteria | null {
  const target = getArtifactToolTarget(toolCards, toolUse);
  if (target) return target;
  if (toolUse.stream?.status !== 'streaming') return null;
  const family = getArtifactToolFamily(toolCards, toolUse.name);
  return family ? { family, artifactId: null } : null;
}

function findTrailingRichBlock(run: AgentRunUnit): RichToolRunBlock | null {
  for (let i = run.blocks.length - 1; i >= 0; i--) {
    const block = run.blocks[i];
    if (block.kind === 'activity') continue;
    return block.kind === 'rich-tool' ? block : null;
  }
  return null;
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
