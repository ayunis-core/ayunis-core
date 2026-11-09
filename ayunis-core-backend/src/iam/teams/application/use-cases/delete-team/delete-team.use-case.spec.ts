import { randomUUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { TeamDeletionRequestedEvent } from 'src/iam/teams/application/events/team-deletion-requested.event';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { Team } from 'src/iam/teams/domain/team.entity';
import { DeleteTeamCommand } from './delete-team.command';
import { DeleteTeamUseCase } from './delete-team.use-case';

describe(DeleteTeamUseCase.name, () => {
  const orgId = randomUUID();
  const team = new Team({ name: 'Building authority', orgId });

  function setup() {
    const order: string[] = [];
    const repository = {
      findById: jest.fn().mockResolvedValue(team),
      delete: jest.fn().mockImplementation(async () => {
        order.push('delete');
      }),
    };
    const cleanup = jest.fn().mockImplementation(async () => {
      order.push('cleanup');
    });
    const events = {
      emitAsync: jest
        .fn()
        .mockImplementation(
          async (_name, event: TeamDeletionRequestedEvent) => {
            order.push('event');
            event.deferCleanup('remove team skill sources', cleanup);
          },
        ),
    };
    const useCase = new DeleteTeamUseCase(
      repository as unknown as TeamsRepository,
      {
        get: jest.fn(getFromUserContext({ orgId })),
      } as unknown as ContextService,
      events as unknown as EventEmitter2,
    );
    return { order, repository, events, cleanup, useCase };
  }

  it('lets listeners resolve cleanup before the delete and runs it afterwards', async () => {
    const { useCase, events, order } = setup();

    await useCase.execute(new DeleteTeamCommand(team.id));

    expect(events.emitAsync).toHaveBeenCalledWith(
      TeamDeletionRequestedEvent.EVENT_NAME,
      expect.objectContaining({ teamId: team.id, orgId }),
    );
    expect(order).toEqual(['event', 'delete', 'cleanup']);
  });

  it('runs no cleanup when the team belongs to another organization', async () => {
    const { useCase, repository, events, cleanup } = setup();
    repository.findById.mockResolvedValue(
      new Team({ name: 'Elsewhere', orgId: randomUUID() }),
    );

    await expect(
      useCase.execute(new DeleteTeamCommand(team.id)),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
    expect(events.emitAsync).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });
});
