import { SourceAssignment } from '../../domain/thread-source-assignment.entity';
import { Thread } from '../../domain/thread.entity';
import { UUID } from 'crypto';

export interface ThreadsFindAllOptions {
  withSources?: boolean;
  withMessages?: boolean;
  withModel?: boolean;
}

export abstract class ThreadsRepository {
  abstract create(thread: Thread): Promise<Thread>;
  abstract findOne(id: UUID, userId: UUID): Promise<Thread | null>;
  abstract findAll(
    userId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]>;
  abstract findAllByModel(
    modelId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]>;
  abstract findAllByAgent(
    agentId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]>;
  abstract update(thread: Thread): Promise<Thread>;
  abstract updateModel(params: {
    threadId: UUID;
    userId: UUID;
    permittedModelId: UUID;
  }): Promise<void>;
  abstract updateTitle(params: {
    threadId: UUID;
    userId: UUID;
    title: string;
  }): Promise<void>;
  abstract updateSourceAssignments(params: {
    threadId: UUID;
    userId: UUID;
    sourceAssignments: SourceAssignment[];
  }): Promise<void>;
  abstract replaceAgentWithModel(params: {
    modelId: UUID;
    agentId: UUID;
    excludeUserId?: UUID;
  }): Promise<void>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
}
