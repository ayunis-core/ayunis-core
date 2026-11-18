import type {
  PastChatActivityRange,
  PastChatScope,
} from 'src/domain/threads/domain/past-chat-scope';

export class FindPastChatsQuery {
  public readonly scope: PastChatScope;
  public readonly activity: PastChatActivityRange;
  public readonly limit: number;
  public readonly offset: number;

  constructor(params: {
    scope: PastChatScope;
    activity: PastChatActivityRange;
    limit: number;
    offset: number;
  }) {
    this.scope = params.scope;
    this.activity = params.activity;
    this.limit = params.limit;
    this.offset = params.offset;
  }
}
