import type {
  Message,
  Thread,
  ToolUseMessageContent,
} from '@/pages/chat/model/openapi';
import {
  getToolUsageKind,
  type ToolUsageKind,
} from '@/pages/chat/ui/agent-run-timeline/lib/tool-classification';
import {
  threadInteractionContext,
  trackOpenPanelEvent,
} from '@/shared/lib/openpanel-events';

type ThreadTurn = 'first' | 'follow_up';

/**
 * The result texts the backend and the agent runtime save for a tool call
 * that failed; the browser receives no other error flag for it.
 */
const FAILED_TOOL_RESULT =
  /^(The tool didn't provide any result due to |A tool with the name .* was not found\.|The run was aborted before this tool call was executed\.)/;

/** Runs this tab reported as delivered, by the first message of their stream. */
const deliveredRunIds = new Set<string>();

interface RunFunnelOptions {
  /** Attaching to a run in progress, which another send already started. */
  isAttach: boolean;
  voiceInput: boolean;
  getThread: () => Thread | undefined;
}

/**
 * Tracks one run stream for the OpenPanel run funnel. A run's stream starts
 * with the message it was started with, which identifies the run when it is
 * streamed again after a reattach.
 */
export function createRunFunnelTracker({
  isAttach,
  voiceInput,
  getThread,
}: RunFunnelOptions) {
  const messages = new Map<string, Message>();
  let run: { id: string; threadTurn: ThreadTurn } | null = null;
  let hasEnded = false;

  return {
    observeMessage(message: Message): void {
      messages.set(message.id, message);
      if (run) return;
      run = { id: message.id, threadTurn: threadTurnOf(getThread(), message) };
      if (isAttach || message.role !== 'user') return;
      trackOpenPanelEvent('run_started', {
        ...threadInteractionContext(getThread()),
        thread_turn: run.threadTurn,
        voice_input: voiceInput,
      });
    },
    /** The server's closing session event, sent only once the run is over. */
    observeRunEnd(): void {
      hasEnded = true;
    },
    /** Call once the stream closed without an error or an abort. */
    trackDelivered(): void {
      if (!hasEnded || !run || deliveredRunIds.has(run.id)) return;
      deliveredRunIds.add(run.id);
      trackOpenPanelEvent('ai_output_delivered', {
        ...threadInteractionContext(getThread()),
        thread_turn: run.threadTurn,
        ...toolUsage(usedToolKinds(messages.values())),
      });
    },
  };
}

function threadTurnOf(
  thread: Thread | undefined,
  runMessage: Message,
): ThreadTurn {
  const saved = thread?.messages ?? [];
  const index = saved.findIndex((message) => message.id === runMessage.id);
  const earlierMessages = index === -1 ? saved.length : index;
  return earlierMessages === 0 ? 'first' : 'follow_up';
}

function usedToolKinds(messages: Iterable<Message>): Set<ToolUsageKind> {
  const results = new Map<string, string>();
  const calls: ToolUseMessageContent[] = [];
  for (const message of messages) {
    if (message.role === 'tool') {
      message.content.forEach((content) =>
        results.set(content.toolId, content.result),
      );
    } else if (message.role === 'assistant') {
      message.content.forEach((content) => {
        if (content.type === 'tool_use') {
          calls.push(content as ToolUseMessageContent);
        }
      });
    }
  }
  const kinds = new Set<ToolUsageKind>();
  for (const call of calls) {
    const result = results.get(call.id);
    if (result === undefined || FAILED_TOOL_RESULT.test(result)) continue;
    const kind = getToolUsageKind(call.name);
    if (kind) kinds.add(kind);
  }
  return kinds;
}

function toolUsage(kinds: ReadonlySet<ToolUsageKind>) {
  return {
    used_knowledge_base: kinds.has('knowledge_base'),
    used_source: kinds.has('source'),
    used_internet_search: kinds.has('internet_search'),
    used_skill: kinds.has('skill'),
    used_integration: kinds.has('integration'),
    created_artifact: kinds.has('artifact'),
  };
}
