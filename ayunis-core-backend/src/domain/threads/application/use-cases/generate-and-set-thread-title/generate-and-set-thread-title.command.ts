import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';

export class GenerateAndSetThreadTitleCommand {
  thread: Thread;
  model: LanguageModel;
  message: string;
  /** Aborts the model call; a title generated after the abort is not saved. */
  signal?: AbortSignal;

  constructor(params: {
    thread: Thread;
    model: LanguageModel;
    message: string;
    signal?: AbortSignal;
  }) {
    this.thread = params.thread;
    this.model = params.model;
    this.message = params.message;
    this.signal = params.signal;
  }
}
