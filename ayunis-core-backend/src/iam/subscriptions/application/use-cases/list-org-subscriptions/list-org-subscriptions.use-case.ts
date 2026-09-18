import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  UnauthorizedSubscriptionAccessError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { classifySubscriptionStatus } from 'src/iam/subscriptions/application/util/classify-subscription-status';
import { getNextRenewalDate } from 'src/iam/subscriptions/application/util/get-next-renewal-date';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import type { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';
import { ListOrgSubscriptionsQuery } from './list-org-subscriptions.query';

export interface OrgSubscriptionListItem {
  subscription: Subscription;
  status: SubscriptionLifecycleStatus;
  isLatest: boolean;
  nextRenewalDate: Date;
}

export interface ListOrgSubscriptionsResult {
  subscriptions: OrgSubscriptionListItem[];
  activeCount: number;
}

@Injectable()
export class ListOrgSubscriptionsUseCase {
  private readonly logger = new Logger(ListOrgSubscriptionsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: ListOrgSubscriptionsQuery,
  ): Promise<ListOrgSubscriptionsResult> {
    this.logger.log(
      { orgId: query.orgId },
      'Listing organization subscriptions',
    );

    try {
      this.assertSuperAdmin(query.orgId);
      const subscriptions = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      return this.toResult(subscriptions);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, orgId: query.orgId },
        'Failed to list organization subscriptions',
      );
      throw new UnexpectedSubscriptionError(
        'Failed to list organization subscriptions',
      );
    }
  }

  private assertSuperAdmin(orgId: UUID): void {
    const systemRole = this.contextService.get('systemRole');
    if (systemRole === SystemRole.SUPER_ADMIN) {
      return;
    }

    this.logger.warn(
      { systemRole, orgId },
      'Non-super admin attempted to list org subscriptions',
    );
    throw new UnauthorizedSubscriptionAccessError(
      this.contextService.get('userId'),
      orgId,
    );
  }

  private toResult(subscriptions: Subscription[]): ListOrgSubscriptionsResult {
    const sorted = [...subscriptions].sort(compareNewestFirst);
    const latestId = sorted[0]?.id;

    return {
      subscriptions: sorted.map((subscription) => ({
        subscription,
        status: classifySubscriptionStatus(subscription),
        isLatest: subscription.id === latestId,
        nextRenewalDate: getNextRenewalDate(subscription),
      })),
      activeCount: sorted.filter(isActive).length,
    };
  }
}

function compareNewestFirst(left: Subscription, right: Subscription): number {
  return right.createdAt.getTime() - left.createdAt.getTime();
}
