import { UUID } from 'crypto';
import { Thread } from '../../../domain/thread.entity';
import { Model } from 'src/domain/models/domain/model.entity';

export class GenerateAndSetThreadTitleCommand {
  thread: Thread;
  model: Model;
  message: string;
  userId: UUID;

  constructor(params: {
    thread: Thread;
    model: Model;
    message: string;
    userId: UUID;
  }) {
    this.thread = params.thread;
    this.model = params.model;
    this.message = params.message;
    this.userId = params.userId;
  }
}
