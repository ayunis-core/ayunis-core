import { UUID } from 'crypto';
import { Thread } from '../../../domain/thread.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

export class GenerateAndSetThreadTitleCommand {
  thread: Thread;
  model: LanguageModel;
  message: string;
  userId: UUID;

  constructor(params: {
    thread: Thread;
    model: LanguageModel;
    message: string;
    userId: UUID;
  }) {
    this.thread = params.thread;
    this.model = params.model;
    this.message = params.message;
    this.userId = params.userId;
  }
}
