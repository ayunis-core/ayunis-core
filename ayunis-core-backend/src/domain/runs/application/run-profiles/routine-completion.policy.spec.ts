import { randomUUID } from 'crypto';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  ROUTINE_NUDGE_MESSAGE,
  routineCompletionPolicy,
} from './routine-completion.policy';

const threadId = randomUUID();
const toolCall = (name: string) =>
  new ToolUseMessageContent(randomUUID(), name, {});
const assistant = (
  ...content: (TextMessageContent | ToolUseMessageContent)[]
) => new AssistantMessage({ threadId, content });

describe('routineCompletionPolicy', () => {
  it('is done when the last assistant turn called finish_routine', () => {
    expect(
      routineCompletionPolicy.decide({
        lastAssistantMessage: assistant(toolCall(ToolType.FINISH_ROUTINE)),
        nudges: 0,
      }),
    ).toEqual({ status: 'done' });
  });

  it('is done when finish_routine came with other calls in the same turn', () => {
    expect(
      routineCompletionPolicy.decide({
        lastAssistantMessage: assistant(
          new TextMessageContent('Fertig.'),
          toolCall(ToolType.WEBSITE_CONTENT),
          toolCall(ToolType.FINISH_ROUTINE),
        ),
        nudges: 2,
      }),
    ).toEqual({ status: 'done' });
  });

  it('nudges when the run ended with a plain text reply', () => {
    expect(
      routineCompletionPolicy.decide({
        lastAssistantMessage: assistant(
          new TextMessageContent('Es gibt zwei neue Verordnungen.'),
        ),
        nudges: 0,
      }),
    ).toEqual({ status: 'nudge', message: ROUTINE_NUDGE_MESSAGE });
  });

  it('tells the model in the nudge that nobody reads its reply and to call finish_routine', () => {
    expect(ROUTINE_NUDGE_MESSAGE).toContain('Nobody can read this reply');
    expect(ROUTINE_NUDGE_MESSAGE).toContain(ToolType.FINISH_ROUTINE);
  });

  it('nudges a second time', () => {
    expect(
      routineCompletionPolicy.decide({
        lastAssistantMessage: assistant(new TextMessageContent('Erledigt.')),
        nudges: 1,
      }).status,
    ).toBe('nudge');
  });

  it('fails after two nudges', () => {
    expect(
      routineCompletionPolicy.decide({
        lastAssistantMessage: assistant(new TextMessageContent('Erledigt.')),
        nudges: 2,
      }),
    ).toEqual({ status: 'failed', reason: 'finish_routine_not_called' });
  });

  it('nudges when the run produced no assistant turn', () => {
    expect(routineCompletionPolicy.decide({ nudges: 0 }).status).toBe('nudge');
  });
});
