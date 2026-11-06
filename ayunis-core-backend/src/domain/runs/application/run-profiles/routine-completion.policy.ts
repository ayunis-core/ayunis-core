import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { RunCompletionPolicy } from './run-profile';

const MAX_NUDGES = 2;
const FINISH_ROUTINE: string = ToolType.FINISH_ROUTINE;

export const ROUTINE_NUDGE_MESSAGE = `Nobody can read this reply. Use your tools to report results and call ${FINISH_ROUTINE} when you are done.`;

/** Only a `finish_routine` call completes a routine; a text reply is nudged. */
export const routineCompletionPolicy: RunCompletionPolicy = {
  decide: ({ lastAssistantMessage, nudges }) => {
    const finished = lastAssistantMessage?.content.some(
      (content) =>
        content instanceof ToolUseMessageContent &&
        content.name === FINISH_ROUTINE,
    );
    if (finished) return { status: 'done' };
    if (nudges < MAX_NUDGES) {
      return { status: 'nudge', message: ROUTINE_NUDGE_MESSAGE };
    }
    return { status: 'failed', reason: 'finish_routine_not_called' };
  },
};
