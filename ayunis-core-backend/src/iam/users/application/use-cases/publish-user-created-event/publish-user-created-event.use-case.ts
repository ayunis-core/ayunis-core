import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class PublishUserCreatedEventUseCase {
  private readonly logger = new Logger(PublishUserCreatedEventUseCase.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  execute(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserCreatedEvent.EVENT_NAME,
        new UserCreatedEvent(user.id, user.orgId, user),
      )
      .catch((error: unknown) => {
        this.logger.error('Failed to emit UserCreatedEvent', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id,
        });
      });
  }
}
