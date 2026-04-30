import type {
  Message,
  AssistantMessage,
  ThinkingMessageContent,
  ToolUseMessageContent,
  TextMessageContent,
} from '@/pages/chat/model/openapi';
import type { RenderUnit, AgentRunUnit, TimelineStep } from '../model/types';
import { isRichTool } from './tool-classification';

interface GroupingOptions {
  isStreaming: boolean;
  toolResultsByToolId: Readonly<Record<string, string>>;
}

export function groupMessagesIntoRuns(
  messages: readonly Message[],
  { isStreaming, toolResultsByToolId }: GroupingOptions,
): RenderUnit[] {
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
      steps: pendingSkillSteps,
      richCards: [],
      finalText: [],
      isStreaming: false,
    });
    pendingSkillSteps = [];

    appendAssistantMessage(run, message, {
      isStreaming,
      isLastMessage: i === messages.length - 1,
      toolResultsByToolId,
    });
  }

  closeRun();

  if (isStreaming && units.length > 0) {
    const lastUnit = units[units.length - 1];
    if (lastUnit.kind === 'agent-run') {
      lastUnit.isStreaming = true;
    } else {
      // Streaming has begun but the assistant's first chunk hasn't arrived;
      // emit an empty run so the UI can show "Working…" instead of nothing.
      units.push({
        kind: 'agent-run',
        key: `run-pending-${lastUnit.message.id}`,
        steps: pendingSkillSteps,
        richCards: [],
        finalText: [],
        isStreaming: true,
      });
    }
  }

  return units;
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
  isStreaming: boolean;
  isLastMessage: boolean;
  toolResultsByToolId: Readonly<Record<string, string>>;
}

function appendAssistantMessage(
  run: AgentRunUnit,
  message: AssistantMessage,
  { isStreaming, isLastMessage, toolResultsByToolId }: AppendOptions,
): void {
  const content = message.content;
  let hasToolUse = false;
  let hasText = false;
  for (const block of content) {
    if (block.type === 'tool_use') hasToolUse = true;
    else if (block.type === 'text') hasText = true;
  }
  const isStreamingThisMessage = isStreaming && isLastMessage;
  // Text without a trailing tool call is the model's reply, not interim narration —
  // so it goes in finalText (rendered outside the timeline) even mid-stream.
  const isFinalMessage = !hasToolUse && hasText;

  let pendingThinking: { transcript: string; key: string } | null = null;
  const flushThinking = (status: 'in_progress' | 'done') => {
    if (pendingThinking) {
      run.steps.push({
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
      const status: 'in_progress' | 'done' = hasResult ? 'done' : 'in_progress';
      run.steps.push({
        kind: 'tool',
        key: `${message.id}-tool-${toolUse.id}`,
        toolUse,
        result,
        status,
      });
      if (isRichTool(toolUse.name)) {
        run.richCards.push({
          key: `${message.id}-card-${toolUse.id}`,
          toolUse,
          result,
        });
      }
      return;
    }

    if (block.type === 'text') {
      const text = block as TextMessageContent;
      if (isFinalMessage) {
        run.finalText.push(text);
      } else {
        run.steps.push({
          kind: 'interim_text',
          key: `${message.id}-text-${index}`,
          text: text.text,
          status: 'done',
        });
      }
    }
  });

  flushThinking(isStreamingThisMessage ? 'in_progress' : 'done');
}
