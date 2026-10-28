import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InviteCreatedEvent } from 'src/iam/invites/application/events/invite-created.event';
import type { Invite } from 'src/iam/invites/domain/invite.entity';

@Injectable()
export class InviteCreatedEventPublisher {
  private readonly logger = new Logger(InviteCreatedEventPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish(invite: Invite): void {
    this.eventEmitter
      .emitAsync(InviteCreatedEvent.EVENT_NAME, new InviteCreatedEvent(invite))
      .catch((error: unknown) => {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            inviteId: invite.id,
          },
          'Failed to emit InviteCreatedEvent',
        );
      });
  }
}
