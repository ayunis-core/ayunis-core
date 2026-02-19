import type { Thread } from '../../../domain/thread.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';

export class GenerateAndSetThreadTitleCommand {
  thread: Thread;
  model: LanguageModel;
  message: string;

  constructor(params: {
    thread: Thread;
    model: LanguageModel;
    message: string;
  }) {
    this.thread = params.thread;
    this.model = params.model;
    this.message = params.message;
  }
}
