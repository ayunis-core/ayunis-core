import type {
  PastChatActivityRange,
  PastChatScope,
} from 'src/domain/threads/domain/past-chat-scope';

export class GrepPastMessagesQuery {
  public readonly scope: PastChatScope;
  /** A PostgreSQL regular expression, matched case-insensitively. */
  public readonly pattern: string;
  public readonly created: PastChatActivityRange;
  public readonly limit: number;

  constructor(params: {
    scope: PastChatScope;
    pattern: string;
    created: PastChatActivityRange;
    limit: number;
  }) {
    this.scope = params.scope;
    this.pattern = params.pattern;
    this.created = params.created;
    this.limit = params.limit;
  }
}
