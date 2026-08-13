import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class UserCreatedEventPublisher {
  constructor(
    @InjectPinoLogger(UserCreatedEventPublisher.name)
    private readonly logger: PinoLogger,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  publish(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserCreatedEvent.EVENT_NAME,
        new UserCreatedEvent(user.id, user.orgId, user),
      )
      .catch((error: unknown) => {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user.id,
          },
          'Failed to emit UserCreatedEvent',
        );
      });
  }
}
