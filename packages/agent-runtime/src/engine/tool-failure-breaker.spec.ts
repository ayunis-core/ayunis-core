import { describe, expect, it, vi } from 'vitest';
import type { Tool } from '../contracts/tool';
import {
  MockProvider,
  toolCallTurn,
  textTurn,
} from '../providers/mock/mock-provider';
import { ToolFailureBreaker } from './tool-failure-breaker';
import { baseInput, collectEvents } from './test-helpers';

describe('ToolFailureBreaker', () => {
  it('trips after three consecutive identical failures of one tool', () => {
    const breaker = new ToolFailureBreaker();
    const failure = {
      toolName: 'create_document',
      result: "Invalid parameters: missing required parameter 'title'",
      isError: true,
    };
    expect(breaker.record([failure])).toBeNull();
    expect(breaker.record([failure])).toBeNull();
    expect(breaker.record([failure])).toEqual({
      toolName: 'create_document',
      failureCount: 3,
    });
  });

  it('does not trip when the error text changes between failures', () => {
    const breaker = new ToolFailureBreaker();
    for (const attempt of [1, 2, 3, 4]) {
      const tripped = breaker.record([
        {
          toolName: 'http_request',
          result: `connection refused on attempt ${attempt}`,
          isError: true,
        },
      ]);
      expect(tripped).toBeNull();
    }
  });

  it('resets the streak when the tool succeeds', () => {
    const breaker = new ToolFailureBreaker();
    const failure = {
      toolName: 'create_document',
      result: 'Invalid parameters',
      isError: true,
    };
    breaker.record([failure]);
    breaker.record([failure]);
    breaker.record([
      {
        toolName: 'create_document',
        result: 'Document created',
        isError: false,
      },
    ]);
    expect(breaker.record([failure])).toBeNull();
    expect(breaker.record([failure])).toBeNull();
  });

  it('counts a phase once, not per outcome — same-turn repeats precede any feedback', () => {
    const breaker = new ToolFailureBreaker();
    const failure = {
      toolName: 'internet_search',
      result: 'search provider returned status 503',
      isError: true,
    };
    // Three identical failures in ONE phase: the model has not seen a single
    // error yet, so this must not trip.
    expect(breaker.record([failure, failure, failure])).toBeNull();
    // Two more failing phases = three consecutive phases with feedback in
    // between — now the loop is provably not converging.
    expect(breaker.record([failure])).toBeNull();
    expect(breaker.record([failure])).toEqual({
      toolName: 'internet_search',
      failureCount: 3,
    });
  });

  it('a success anywhere in the phase clears the tool streak', () => {
    const breaker = new ToolFailureBreaker();
    const failure = {
      toolName: 'create_document',
      result: "Invalid parameters: missing required parameter 'title'",
      isError: true,
    };
    const success = {
      toolName: 'create_document',
      result: 'Document created successfully. Artifact ID: 7f3c',
      isError: false,
    };
    breaker.record([failure]);
    breaker.record([failure]);
    // Mixed phase: the tool works — the loop is converging, nothing latches.
    expect(breaker.record([failure, success])).toBeNull();
    expect(breaker.record([failure])).toBeNull();
    expect(breaker.record([failure])).toBeNull();
  });

  it('differing error texts within one phase start a fresh streak', () => {
    const breaker = new ToolFailureBreaker();
    const timeout = {
      toolName: 'http_request',
      result: 'request timed out after 30000ms',
      isError: true,
    };
    const refused = {
      toolName: 'http_request',
      result: 'connection refused',
      isError: true,
    };
    breaker.record([refused]);
    breaker.record([refused]);
    // Varied errors are not the identical-repeat pattern.
    expect(breaker.record([timeout, refused])).toBeNull();
    expect(breaker.record([refused])).toBeNull();
  });

  it('tracks tools independently', () => {
    const breaker = new ToolFailureBreaker();
    const documentFailure = {
      toolName: 'create_document',
      result: "Invalid parameters: missing required parameter 'title'",
      isError: true,
    };
    const searchFailure = {
      toolName: 'internet_search',
      result: 'search provider returned status 503',
      isError: true,
    };
    breaker.record([documentFailure, searchFailure]);
    breaker.record([documentFailure]);
    expect(breaker.record([searchFailure])).toBeNull();
    expect(breaker.record([documentFailure])).toEqual({
      toolName: 'create_document',
      failureCount: 3,
    });
  });
});

describe('run loop with a repeatedly failing tool', () => {
  const failingCall = {
    id: 'call_1',
    name: 'create_document',
    input: { content: '<h1>Bericht</h1>' },
  };

  it('aborts with TOOL_REPEATEDLY_FAILING instead of burning all iterations', async () => {
    const execute = vi.fn(() => {
      throw new Error("Invalid parameters: missing required parameter 'title'");
    });
    const tool: Tool = {
      name: 'create_document',
      description: 'Creates a document',
      parameters: { type: 'object', properties: {} },
      execute,
    };
    const provider = new MockProvider([
      toolCallTurn(failingCall),
      toolCallTurn(failingCall),
      toolCallTurn(failingCall),
      toolCallTurn(failingCall),
      toolCallTurn(failingCall),
    ]);

    const events = await collectEvents(baseInput(provider, { tools: [tool] }));

    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('TOOL_REPEATEDLY_FAILING');
    // The third identical failure trips the breaker; no fourth model call.
    expect(execute).toHaveBeenCalledTimes(3);
    expect(provider.requests).toHaveLength(3);
    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('error');
  });

  it('does not mistake synthetic aborted results for repeated failures', async () => {
    const controller = new AbortController();
    const execute = vi.fn(() => {
      controller.abort();
      return 'record found';
    });
    const tool: Tool = {
      name: 'lookup',
      description: 'Looks up a record',
      parameters: { type: 'object', properties: {} },
      execute,
    };
    // One turn with four calls to the same tool: the first execution aborts
    // the run, so the remaining three receive the identical synthetic
    // aborted result — which must not read as a repeated tool failure.
    const provider = new MockProvider([
      [
        {
          toolCallDeltas: [
            { index: 0, id: 'c1', name: 'lookup' },
            { index: 1, id: 'c2', name: 'lookup' },
            { index: 2, id: 'c3', name: 'lookup' },
            { index: 3, id: 'c4', name: 'lookup' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [tool], signal: controller.signal }),
    );

    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('aborted');
  });

  it('keeps looping when the tool recovers before the threshold', async () => {
    let attempt = 0;
    const tool: Tool = {
      name: 'create_document',
      description: 'Creates a document',
      parameters: { type: 'object', properties: {} },
      execute: () => {
        attempt += 1;
        if (attempt < 3) {
          throw new Error('Invalid parameters');
        }
        return 'Document created successfully';
      },
    };
    const provider = new MockProvider([
      toolCallTurn(failingCall),
      toolCallTurn(failingCall),
      toolCallTurn(failingCall),
      textTurn('Das Dokument ist fertig.'),
    ]);

    const events = await collectEvents(baseInput(provider, { tools: [tool] }));

    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('completed');
    expect(events.find((event) => event.type === 'error')).toBeUndefined();
  });
});
