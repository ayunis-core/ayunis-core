import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { InviteCreatedEvent } from 'src/iam/invites/application/events/invite-created.event';
import { InviteCreatedEventPublisher } from 'src/iam/invites/application/services/invite-created-event-publisher.service';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const INVITE_ID = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;
const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

describe(InviteCreatedEventPublisher.name, () => {
  it('publishes the canonical invite-created event', () => {
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as EventEmitter2;
    const publisher = new InviteCreatedEventPublisher(eventEmitter);
    const invite = makeInvite();

    publisher.publish(invite);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      InviteCreatedEvent.EVENT_NAME,
      new InviteCreatedEvent(invite),
    );
  });

  it('does not fail completed invitation creation when a handler rejects', () => {
    const eventEmitter = {
      emitAsync: jest.fn().mockRejectedValue(new Error('handler failed')),
    } as unknown as EventEmitter2;
    const publisher = new InviteCreatedEventPublisher(eventEmitter);

    expect(() => publisher.publish(makeInvite())).not.toThrow();
  });
});

function makeInvite(): Invite {
  return new Invite({
    id: INVITE_ID,
    email: 'staff@stadt.example',
    orgId: ORG_ID,
    role: UserRole.USER,
    expiresAt: new Date('2026-10-02T12:00:00.000Z'),
    createdAt: new Date('2026-09-25T12:00:00.000Z'),
  });
}
