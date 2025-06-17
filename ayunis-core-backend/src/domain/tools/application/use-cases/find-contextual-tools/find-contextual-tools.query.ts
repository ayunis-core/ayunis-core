import { Thread } from '../../../../threads/domain/thread.entity';

export class FindContextualToolsQuery {
  public readonly thread: Thread;

  constructor(params: { thread: Thread }) {
    this.thread = params.thread;
  }
}
