import { Thread } from '../../domain/thread.entity';
import { UUID } from 'crypto';

export abstract class ThreadsRepository {
  abstract create(thread: Thread): Promise<Thread>;
  abstract findOne(id: UUID, userId: UUID): Promise<Thread | null>;
  abstract findAll(userId: UUID): Promise<Thread[]>;
  abstract findAllByModel(modelId: UUID): Promise<Thread[]>;
  abstract findAllByAgent(agentId: UUID): Promise<Thread[]>;
  abstract update(thread: Thread): Promise<Thread>;
  abstract updateModel(params: {
    threadId: UUID;
    userId: UUID;
    permittedModelId: UUID;
  }): Promise<void>;
  abstract updateAgent(params: {
    threadId: UUID;
    userId: UUID;
    agentId: UUID;
  }): Promise<void>;
  abstract updateTitle(params: {
    threadId: UUID;
    userId: UUID;
    title: string;
  }): Promise<void>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
}
