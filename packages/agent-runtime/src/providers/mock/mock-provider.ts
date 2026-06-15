import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
  Usage,
} from '../../contracts/provider';

/**
 * Deterministic provider for tests and examples. Plays back one scripted
 * chunk turn per stream() call and records every request it receives
 * (snapshotted, so later state mutations don't affect assertions).
 */
export class MockProvider implements ModelProvider {
  readonly name = 'mock';
  readonly requests: ProviderRequest[] = [];
  private turnIndex = 0;

  constructor(private readonly turns: readonly (readonly ProviderChunk[])[]) {}

  async *stream(request: ProviderRequest): AsyncIterable<ProviderChunk> {
    this.requests.push(snapshotRequest(request));
    const turn = this.turns[this.turnIndex] ?? [];
    this.turnIndex += 1;
    for (const chunk of turn) {
      await Promise.resolve();
      yield chunk;
    }
  }
}

const snapshotRequest = (request: ProviderRequest): ProviderRequest => {
  return {
    instructions: request.instructions,
    messages: [...request.messages],
    tools: request.tools.map((tool) => ({ ...tool })),
    ...(request.toolChoice !== undefined
      ? { toolChoice: request.toolChoice }
      : {}),
  };
};

const DEFAULT_USAGE: Usage = { inputTokens: 10, outputTokens: 5 };

/** A text-only turn, split into two deltas plus a finish chunk. */
export const textTurn = (
  text: string,
  usage: Usage = DEFAULT_USAGE,
): ProviderChunk[] => {
  const mid = Math.ceil(text.length / 2);
  return [
    { textDelta: text.slice(0, mid) },
    { textDelta: text.slice(mid) },
    { finishReason: 'stop', usage },
  ];
};

/** A tool-call turn with the arguments JSON split across two deltas. */
export const toolCallTurn = (
  call: { id: string; name: string; input: Record<string, unknown> },
  usage: Usage = DEFAULT_USAGE,
): ProviderChunk[] => {
  const json = JSON.stringify(call.input);
  const mid = Math.ceil(json.length / 2);
  return [
    { toolCallDeltas: [{ index: 0, id: call.id, name: call.name }] },
    { toolCallDeltas: [{ index: 0, argumentsDelta: json.slice(0, mid) }] },
    { toolCallDeltas: [{ index: 0, argumentsDelta: json.slice(mid) }] },
    { finishReason: 'tool_calls', usage },
  ];
};
