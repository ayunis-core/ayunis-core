import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class UserUpdatedEventPublisher {
  private readonly logger = new Logger(UserUpdatedEventPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserUpdatedEvent.EVENT_NAME,
        new UserUpdatedEvent(user.id, user.orgId, user),
      )
      .catch((error: unknown) => {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user.id,
          },
          'Failed to emit UserUpdatedEvent',
        );
      });
  }
}
