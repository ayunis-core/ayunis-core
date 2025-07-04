import { Injectable, NotFoundException } from '@nestjs/common';
import { ResetSeatsCommand } from './reset-seats.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';

@Injectable()
export class ResetSeatsUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
  ) {}

  async execute(command: ResetSeatsCommand): Promise<void> {
    const subscription = await this.subscriptionRepository.findByOrgId(
      command.orgId,
    );
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    const users = await this.findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery(command.orgId),
    );
    subscription.noOfSeats = users.length;
    await this.subscriptionRepository.update(subscription);
  }
}
