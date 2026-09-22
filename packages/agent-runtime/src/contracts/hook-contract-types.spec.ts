import { describe, expect, it } from 'vitest';

import type {
  AfterModelCallContext,
  AfterModelTurnContext,
  BeforeModelCallContext,
  RunEndContext,
} from './hook';

describe('hook snapshot types', () => {
  it('exposes immutable snapshots and only effective terminal controls', () => {
    const assertContracts = (
      beforeCall: BeforeModelCallContext,
      afterCall: AfterModelCallContext,
      afterTurn: AfterModelTurnContext,
      runEnd: RunEndContext,
    ): void => {
      // @ts-expect-error afterModelCall mutations would be discarded
      afterCall.addInstructions('ignored');
      // @ts-expect-error runEnd mutations would be discarded
      runEnd.transformMessages((messages) => [...messages]);

      afterTurn.addInstructions('effective next-turn mutation');

      // @ts-expect-error immutable call usage snapshot
      afterCall.outcome.usage.inputTokens = 1;
      // @ts-expect-error immutable call message snapshot
      afterCall.message.content.push({ type: 'text', text: 'tampered' });
      // @ts-expect-error immutable request message snapshot
      beforeCall.request.messages[0].content[0].type = 'thinking';
      // @ts-expect-error immutable turn message snapshot
      afterTurn.messages[0].content[0].type = 'thinking';
      // @ts-expect-error immutable run-end message snapshot
      runEnd.messages[0].content[0].type = 'thinking';
      if (runEnd.error) {
        // @ts-expect-error immutable run-end error snapshot
        runEnd.error.message = 'tampered';
      }
    };

    expect(assertContracts).toBeTypeOf('function');
  });
});
