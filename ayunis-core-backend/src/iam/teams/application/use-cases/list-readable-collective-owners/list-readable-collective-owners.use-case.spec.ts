import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { ListReadableCollectiveOwnersUseCase } from './list-readable-collective-owners.use-case';

describe(ListReadableCollectiveOwnersUseCase.name, () => {
  it("returns the caller's organization and their teams in it", async () => {
    const orgId = randomUUID();
    const userId = randomUUID();
    const ownTeam = new Team({ name: 'Building authority', orgId });
    const foreignTeam = new Team({ name: 'Elsewhere', orgId: randomUUID() });
    const repository = {
      findByUserId: jest.fn().mockResolvedValue([ownTeam, foreignTeam]),
    };
    const useCase = new ListReadableCollectiveOwnersUseCase(
      repository as unknown as TeamsRepository,
      {
        get: jest.fn(getFromUserContext({ userId, orgId })),
      } as unknown as ContextService,
    );

    await expect(useCase.execute()).resolves.toEqual({
      orgId,
      teamIds: [ownTeam.id],
    });
    expect(repository.findByUserId).toHaveBeenCalledWith(userId);
  });
});
