import type { UUID } from 'crypto';
import { QueryFailedError, type Repository } from 'typeorm';
import type { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import type { PastMessageMatch } from 'src/domain/threads/application/models/past-message-match';
import type { GrepPastMessagesParams } from 'src/domain/threads/application/ports/threads.repository';
import {
  InvalidPastMessagePatternError,
  PastMessageSearchTimeoutError,
} from 'src/domain/threads/application/threads.errors';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { pastChatsQuery } from './past-chats';
import {
  SEARCHABLE_MESSAGE_ROLES,
  searchableTextBlockSql,
} from './searchable-message-text';

const EXCERPT_LEAD = 100;
const EXCERPT_LENGTH = 300;
const PG_INVALID_REGULAR_EXPRESSION = '2201B';
const PG_QUERY_CANCELED = '57014';

interface MatchRow {
  threadId: UUID;
  threadTitle: string | null;
  role: MessageRole.USER | MessageRole.ASSISTANT;
  createdAt: Date;
  messageNumber: number;
  excerpt: string;
  cutBefore: boolean;
  cutAfter: boolean;
}

/**
 * The matching messages are found and limited first, from the chats in scope
 * through the `(threadId, createdAt)` index; only those are then numbered and
 * cut into excerpts.
 */
export async function grepPastMessages(
  threadRepository: Repository<ThreadRecord>,
  params: GrepPastMessagesParams,
): Promise<PastMessageMatch[]> {
  const [matchingSql, parameters]: [string, unknown[]] = matchingMessagesQuery(
    threadRepository,
    params,
  ).getQueryAndParameters();
  const pattern = `$${parameters.length + 1}`;
  try {
    const rows = await threadRepository.query<MatchRow[]>(
      `SELECT hit."threadId", hit."threadTitle", hit.role, hit."createdAt",
         (SELECT count(*) FROM messages earlier
          WHERE earlier."threadId" = hit."threadId"
            AND (earlier."createdAt", earlier.id) <= (hit."createdAt", hit.id)
         )::int AS "messageNumber",
         substr(matched.text, excerpt.start, ${EXCERPT_LENGTH}) AS excerpt,
         excerpt.start > 1 AS "cutBefore",
         char_length(matched.text) >= excerpt.start + ${EXCERPT_LENGTH} AS "cutAfter"
       FROM (${matchingSql}) hit
       CROSS JOIN LATERAL (
         SELECT item.block->>'text' AS text
         FROM jsonb_array_elements(hit.content) WITH ORDINALITY AS item(block, position)
         WHERE ${searchableTextBlockSql('item.block')}
           AND item.block->>'text' ~* ${pattern}
         ORDER BY item.position
         LIMIT 1
       ) matched
       CROSS JOIN LATERAL (
         SELECT greatest(1, regexp_instr(matched.text, ${pattern}, 1, 1, 0, 'i') - ${EXCERPT_LEAD}) AS start
       ) excerpt
       ORDER BY hit."createdAt" DESC, hit.id DESC`,
      [...parameters, params.pattern],
    );
    return rows.map(toMatch);
  } catch (error) {
    throw toSearchError(error);
  }
}

function matchingMessagesQuery(
  threadRepository: Repository<ThreadRecord>,
  params: GrepPastMessagesParams,
) {
  const { userId, client, scope, pattern, created, limit } = params;
  const query = pastChatsQuery(threadRepository, userId, client, scope)
    .innerJoin(MessageRecord, 'message', 'message.threadId = thread.id')
    .select('message.id', 'id')
    .addSelect('message.threadId', 'threadId')
    .addSelect('thread.title', 'threadTitle')
    .addSelect('message.role', 'role')
    .addSelect('message.content', 'content')
    .addSelect('message.createdAt', 'createdAt')
    .andWhere('message.role IN (:...grepRoles)', {
      grepRoles: SEARCHABLE_MESSAGE_ROLES,
    })
    .andWhere(
      `EXISTS (
        SELECT 1 FROM jsonb_array_elements(message.content) AS block
        WHERE ${searchableTextBlockSql('block')}
          AND block->>'text' ~* :pattern
      )`,
      { pattern },
    );
  if (created.from) {
    query.andWhere('message.createdAt >= :grepFrom', {
      grepFrom: created.from,
    });
  }
  if (created.before) {
    query.andWhere('message.createdAt < :grepBefore', {
      grepBefore: created.before,
    });
  }
  return query
    .orderBy('message.createdAt', 'DESC')
    .addOrderBy('message.id', 'DESC')
    .limit(limit);
}

function toMatch(row: MatchRow): PastMessageMatch {
  return {
    threadId: row.threadId,
    threadTitle: row.threadTitle,
    messageNumber: row.messageNumber,
    role: row.role,
    createdAt: row.createdAt,
    excerpt: `${row.cutBefore ? '…' : ''}${row.excerpt}${row.cutAfter ? '…' : ''}`,
  };
}

function toSearchError(error: unknown): unknown {
  if (!(error instanceof QueryFailedError)) return error;
  const driverError = error.driverError as { code?: string; message?: string };
  if (driverError.code === PG_INVALID_REGULAR_EXPRESSION) {
    return new InvalidPastMessagePatternError(
      driverError.message ?? error.message,
    );
  }
  if (driverError.code === PG_QUERY_CANCELED) {
    return new PastMessageSearchTimeoutError();
  }
  return error;
}
