import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';
import { isSeatBased } from '../../domain/subscription-type-guards';
import type { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import type { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';

export async function computeAvailableSeats(
  subscription: Subscription,
  orgId: UUID,
  requestingUserId: UUID,
  getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
  findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
): Promise<number | null> {
  if (!isSeatBased(subscription)) {
    return null;
  }

  const [invitesResult, usersResult] = await Promise.all([
    getInvitesByOrgUseCase.execute(
      new GetInvitesByOrgQuery({
        orgId,
        requestingUserId,
        onlyOpen: true,
      }),
    ),
    findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery({
        orgId,
        pagination: { limit: 1000, offset: 0 },
      }),
    ),
  ]);

  const openInvitesCount = invitesResult.total ?? invitesResult.data.length;
  const userCount = usersResult.total ?? usersResult.data.length;
  return subscription.noOfSeats - openInvitesCount - userCount;
}
