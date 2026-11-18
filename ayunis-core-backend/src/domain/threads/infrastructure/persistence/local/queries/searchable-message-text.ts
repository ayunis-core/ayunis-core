import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

/**
 * Which text the chat searches look through, shared by the sidebar search and
 * `chat_grep` so both always search the same text; each decides how to match
 * it. Only user and assistant messages count.
 */
export const SEARCHABLE_MESSAGE_ROLES = [
  MessageRole.USER,
  MessageRole.ASSISTANT,
];

/**
 * Condition on one element `block` of a message's `content`: a text block the
 * user wrote or read in the conversation. Skill instructions and nudges are
 * injected text; tool calls and results, thinking and images are not text
 * blocks.
 */
export function searchableTextBlockSql(block: string): string {
  return `${block}->>'type' = 'text'
        AND ${block}->>'isSkillInstruction' IS DISTINCT FROM 'true'
        AND ${block}->>'isNudge' IS DISTINCT FROM 'true'`;
}
