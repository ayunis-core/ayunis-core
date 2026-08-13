import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { PublishUserCreatedEventUseCase } from 'src/iam/users/application/use-cases/publish-user-created-event/publish-user-created-event.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const USER_ID = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;
const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

describe(PublishUserCreatedEventUseCase.name, () => {
  it('publishes the canonical user-created event', () => {
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as EventEmitter2;
    const useCase = new PublishUserCreatedEventUseCase(eventEmitter);
    const user = federatedUser();

    useCase.execute(user);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      UserCreatedEvent.EVENT_NAME,
      new UserCreatedEvent(USER_ID, ORG_ID, user),
    );
  });

  it('does not fail completed provisioning when an event handler rejects', () => {
    const eventEmitter = {
      emitAsync: jest.fn().mockRejectedValue(new Error('handler failed')),
    } as unknown as EventEmitter2;
    const useCase = new PublishUserCreatedEventUseCase(eventEmitter);

    expect(() => useCase.execute(federatedUser())).not.toThrow();
  });
});

function federatedUser(): User {
  return new User({
    id: USER_ID,
    email: 'staff@stadt.example',
    emailVerified: true,
    passwordHash: null,
    role: UserRole.USER,
    orgId: ORG_ID,
    name: 'Erika Mustermann',
    hasAcceptedMarketing: false,
  });
}
