import { describe, expect, it, vi } from 'vitest';
import type { Hook, ModelCallInterruptedContext } from '../contracts/hook';
import type { Tool } from '../contracts/tool';
import { MockProvider } from '../providers/mock/mock-provider';
import { baseInput, collectEvents } from './test-helpers';

/**
 * A model response whose tool-call arguments did not arrive intact (unparseable
 * JSON, or the token limit hit mid-call) must fail the run instead of executing
 * the tool with guessed input — executing with `{}` fails schema validation
 * identically on every retry, which produced the endless document-creation
 * loop of AYC-646.
 */
describe('tool-call argument integrity', () => {
  const documentTool = (execute = vi.fn(() => 'created')): Tool => ({
    name: 'create_document',
    description: 'Creates a document',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['title', 'content'],
    },
    execute,
  });

  it('fails the run with MALFORMED_TOOL_CALL when final arguments are unparseable', async () => {
    const execute = vi.fn(() => 'created');
    const provider = new MockProvider([
      [
        {
          toolCallDeltas: [{ index: 0, id: 'call_1', name: 'create_document' }],
        },
        {
          toolCallDeltas: [
            {
              index: 0,
              argumentsDelta:
                '{"title":"Parkraumkonzept","content":"<h1>Bericht</h1><p>Sehr geehrte Damen',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool(execute)] }),
    );

    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('MALFORMED_TOOL_CALL');
    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('error');
    expect(execute).not.toHaveBeenCalled();
  });

  it('fails the run when the token limit is reached while emitting a tool call', async () => {
    const execute = vi.fn(() => 'created');
    const provider = new MockProvider([
      [
        {
          toolCallDeltas: [{ index: 0, id: 'call_1', name: 'create_document' }],
        },
        {
          toolCallDeltas: [
            {
              index: 0,
              argumentsDelta: '{"title":"Bericht","content":"<h1>Kurz</h1>"}',
            },
          ],
        },
        { finishReason: 'length' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool(execute)] }),
    );

    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('MALFORMED_TOOL_CALL');
    expect(execute).not.toHaveBeenCalled();
  });

  it('fires modelCallInterrupted so intact text of the malformed turn can be persisted', async () => {
    const interruptions: { reason: string; text: string }[] = [];
    const observer: Hook = {
      name: 'observer',
      modelCallInterrupted: (ctx: ModelCallInterruptedContext) => {
        const text = ctx.message.content
          .filter((content) => content.type === 'text')
          .map((content) => content.text)
          .join('');
        interruptions.push({ reason: ctx.reason, text });
      },
    };
    const provider = new MockProvider([
      [
        { textDelta: 'Ich erstelle jetzt das Dokument.' },
        {
          toolCallDeltas: [{ index: 0, id: 'call_1', name: 'create_document' }],
        },
        {
          toolCallDeltas: [
            { index: 0, argumentsDelta: '{"title":"Bericht","content":"<h1>' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool()], hooks: [observer] }),
    );

    // The turn's streamed text must reach the interruption hook — it is what
    // persists partial display content when a model call fails (AYC-613).
    expect(interruptions).toEqual([
      { reason: 'error', text: 'Ich erstelle jetzt das Dokument.' },
    ]);
    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('MALFORMED_TOOL_CALL');
  });

  it('still executes a tool call that streamed no arguments at all', async () => {
    const execute = vi.fn(() => 'three letterheads');
    const listTool: Tool = {
      name: 'list_letterheads',
      description: 'Lists available letterheads',
      parameters: { type: 'object', properties: {} },
      execute,
    };
    const provider = new MockProvider([
      [
        {
          toolCallDeltas: [
            { index: 0, id: 'call_1', name: 'list_letterheads' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      [{ textDelta: 'Done.' }, { finishReason: 'stop' }],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [listTool] }),
    );

    expect(execute).toHaveBeenCalledWith({}, expect.anything());
    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('completed');
  });
});
