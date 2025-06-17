import { Thread } from '../../domain/thread.entity';
import { UUID } from 'crypto';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

export abstract class ThreadsRepository {
  abstract create(thread: Thread): Promise<Thread>;
  abstract findOne(id: UUID, userId: UUID): Promise<Thread | null>;
  abstract findAll(userId: UUID): Promise<Thread[]>;
  abstract update(thread: Thread): Promise<Thread>;
  abstract updateTitle(id: UUID, userId: UUID, title: string): Promise<void>;
  abstract updateInstruction(
    id: UUID,
    userId: UUID,
    instruction: string,
  ): Promise<void>;
  abstract updateModel(
    id: UUID,
    userId: UUID,
    model: PermittedModel,
  ): Promise<void>;
  abstract updateInternetSearch(
    id: UUID,
    userId: UUID,
    isInternetSearchEnabled: boolean,
  ): Promise<void>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
}
