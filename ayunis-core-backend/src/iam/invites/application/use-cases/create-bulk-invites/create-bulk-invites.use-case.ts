import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { CreateBulkInvitesCommand } from './create-bulk-invites.command';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { UpdateSeatsCommand } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.command';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import {
  BulkInviteValidationFailedError,
  InvalidSeatsError,
  UnexpectedInviteError,
} from '../../invites.errors';
import { SendInvitationEmailUseCase } from '../send-invitation-email/send-invitation-email.use-case';
import { SendInvitationEmailCommand } from '../send-invitation-email/send-invitation-email.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { SubscriptionNotFoundError } from 'src/iam/subscriptions/application/subscription.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { getInviteExpiresAt } from '../../services/invite-expiration.util';
import {
  ValidationError,
  groupInviteRowsByEmail,
  collectDuplicateEmailErrors,
  collectInviteRowErrors,
} from './create-bulk-invites.validation';

interface BulkInviteResult {
  email: string;
  role: UserRole;
  success: boolean;
  url: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface CreateBulkInvitesResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: BulkInviteResult[];
}

interface InviteDeliveryConfig {
  hasEmailConfig: boolean;
  frontendBaseUrl: string;
  inviteAcceptEndpoint: string;
  validDuration: string;
}

type InviteData = CreateBulkInvitesCommand['invites'][number];

type ActiveSubscriptionResult = Awaited<
  ReturnType<GetActiveSubscriptionUseCase['execute']>
>;

@Injectable()
export class CreateBulkInvitesUseCase {
  private readonly logger = new Logger(CreateBulkInvitesUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly updateSeatsUseCase: UpdateSeatsUseCase,
    private readonly sendInvitationEmailUseCase: SendInvitationEmailUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: CreateBulkInvitesCommand,
  ): Promise<CreateBulkInvitesResult> {
    this.logger.log('execute', {
      inviteCount: command.invites.length,
      orgId: command.orgId,
      userId: command.userId,
    });

    try {
      // Phase 1: Validation
      const validationErrors = await this.validateAllInvites(command);

      if (validationErrors.length > 0) {
        throw new BulkInviteValidationFailedError(validationErrors);
      }

      // Phase 2: Check and update seats if needed (for cloud deployments)
      await this.handleSeatsForBulkInvites(command);

      // Phase 3: Process all invites
      const results = await this.processInvites(command);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.logger.log('Bulk invites completed', {
        totalCount: command.invites.length,
        successCount,
        failureCount,
      });

      return {
        totalCount: command.invites.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating bulk invites', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedInviteError(error as Error);
    }
  }

  private async validateAllInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<ValidationError[]> {
    const emailRows = groupInviteRowsByEmail(command.invites);
    const duplicateErrors = collectDuplicateEmailErrors(emailRows);

    const uniqueEmails = [...emailRows.keys()];
    const existingInviteEmails =
      await this.findExistingInviteEmails(uniqueEmails);
    const registeredUserEmails =
      await this.findRegisteredUserEmails(uniqueEmails);
    const emailProviderBlacklist =
      this.configService.get<string[]>('auth.emailProviderBlacklist') ?? [];

    const rowErrors = collectInviteRowErrors(command.invites, {
      emailRows,
      existingInviteEmails,
      registeredUserEmails,
      emailProviderBlacklist,
    });

    return [...duplicateErrors, ...rowErrors];
  }

  private async findExistingInviteEmails(
    emails: string[],
  ): Promise<Set<string>> {
    // invites.email carries a GLOBAL unique constraint, so an invite row for
    // any requested email — even in another org, or already accepted/orphaned —
    // makes createMany fail with a DB unique violation (surfacing as a 500).
    // Look invites up globally so those conflicts are reported as validation
    // errors up front (AYC-735).
    const existingInvites = await this.invitesRepository.findByEmails(emails);
    return new Set(existingInvites.map((i) => i.email.toLowerCase()));
  }

  private async findRegisteredUserEmails(
    emails: string[],
  ): Promise<Set<string>> {
    const existingUsers = await this.usersRepository.findManyByEmails(emails);
    return new Set(existingUsers.map((u) => u.email.toLowerCase()));
  }

  private async handleSeatsForBulkInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<void> {
    const isCloud = this.configService.get<boolean>('app.isCloudHosted', false);
    if (!isCloud) {
      return;
    }

    const subscription = await this.fetchActiveSubscription(command);
    if (!subscription) {
      return;
    }

    // Seat management only applies to seat-based subscriptions
    const sub = subscription.subscription;
    if (!isSeatBased(sub)) {
      return;
    }

    if (
      subscription.availableSeats !== null &&
      subscription.availableSeats < 0
    ) {
      throw new InvalidSeatsError({
        orgId: command.orgId,
        availableSeats: subscription.availableSeats,
      });
    }

    await this.increaseSeatsIfNeeded(command, subscription, sub);
  }

  private async fetchActiveSubscription(
    command: CreateBulkInvitesCommand,
  ): Promise<ActiveSubscriptionResult | null> {
    try {
      return await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.userId,
        }),
      );
    } catch (error) {
      if (error instanceof SubscriptionNotFoundError) {
        this.logger.debug('No active subscription found, proceeding', {
          orgId: command.orgId,
        });
        return null;
      }
      throw error;
    }
  }

  private async increaseSeatsIfNeeded(
    command: CreateBulkInvitesCommand,
    subscription: ActiveSubscriptionResult,
    sub: SeatBasedSubscription,
  ): Promise<void> {
    const inviteCount = command.invites.length;
    if (
      subscription.availableSeats === null ||
      subscription.availableSeats >= inviteCount
    ) {
      return;
    }

    const additionalSeatsNeeded = inviteCount - subscription.availableSeats;
    await this.updateSeatsUseCase.execute(
      new UpdateSeatsCommand({
        orgId: command.orgId,
        requestingUserId: command.userId,
        noOfSeats: sub.noOfSeats + additionalSeatsNeeded,
      }),
    );
  }

  private async processInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<BulkInviteResult[]> {
    const deliveryConfig = this.resolveInviteDeliveryConfig();
    const invites = this.buildInvites(command, deliveryConfig.validDuration);

    // Batch insert all invites
    await this.invitesRepository.createMany(invites);
    this.logger.debug('Invites batch created successfully', {
      count: invites.length,
    });

    // Process each invite for token generation and email sending
    const results: BulkInviteResult[] = [];
    for (let i = 0; i < invites.length; i++) {
      results.push(
        await this.deliverInvite(
          invites[i],
          command.invites[i],
          deliveryConfig,
        ),
      );
    }

    return results;
  }

  private resolveInviteDeliveryConfig(): InviteDeliveryConfig {
    return {
      hasEmailConfig:
        this.configService.get<boolean>('emails.hasConfig') ?? false,
      frontendBaseUrl:
        this.configService.get<string>('app.frontend.baseUrl') ?? '',
      inviteAcceptEndpoint:
        this.configService.get<string>('app.frontend.inviteAcceptEndpoint') ??
        '',
      validDuration: this.configService.get<string>(
        'auth.jwt.inviteExpiresIn',
        '7d',
      ),
    };
  }

  private buildInvites(
    command: CreateBulkInvitesCommand,
    validDuration: string,
  ): Invite[] {
    const inviteExpiresAt = getInviteExpiresAt(validDuration);
    return command.invites.map(
      (inviteData) =>
        new Invite({
          email: inviteData.email,
          orgId: command.orgId,
          role: inviteData.role,
          inviterId: command.userId,
          expiresAt: inviteExpiresAt,
        }),
    );
  }

  private async deliverInvite(
    invite: Invite,
    inviteData: InviteData,
    config: InviteDeliveryConfig,
  ): Promise<BulkInviteResult> {
    try {
      const inviteToken = this.inviteJwtService.generateInviteToken({
        inviteId: invite.id,
      });
      const inviteAcceptUrl = `${config.frontendBaseUrl}${config.inviteAcceptEndpoint}?token=${inviteToken}`;

      if (!config.hasEmailConfig) {
        // No email config - return URL
        return this.buildSuccessResult(inviteData, inviteAcceptUrl);
      }

      return await this.sendInviteEmail(invite, inviteData, inviteAcceptUrl);
    } catch (error) {
      this.logger.error('Failed to process invite', {
        email: inviteData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.deleteInviteQuietly(
        invite,
        inviteData.email,
        'processing failure',
      );
      return this.buildFailureResult(
        inviteData,
        error instanceof ApplicationError ? error.code : 'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async sendInviteEmail(
    invite: Invite,
    inviteData: InviteData,
    inviteAcceptUrl: string,
  ): Promise<BulkInviteResult> {
    try {
      await this.sendInvitationEmailUseCase.execute(
        new SendInvitationEmailCommand(invite, inviteAcceptUrl),
      );
      return this.buildSuccessResult(inviteData, null);
    } catch (emailError) {
      this.logger.warn('Failed to send invitation email', {
        email: inviteData.email,
        error:
          emailError instanceof Error ? emailError.message : 'Unknown error',
      });
      // Delete the invite since email delivery failed
      await this.deleteInviteQuietly(
        invite,
        inviteData.email,
        'email sending failure',
      );
      return this.buildFailureResult(
        inviteData,
        'EMAIL_SENDING_FAILED',
        emailError instanceof Error
          ? emailError.message
          : 'Failed to send invitation email',
      );
    }
  }

  private async deleteInviteQuietly(
    invite: Invite,
    email: string,
    context: string,
  ): Promise<void> {
    try {
      await this.invitesRepository.delete(invite.id);
      this.logger.debug(`Deleted invite after ${context}`, {
        inviteId: invite.id,
        email,
      });
    } catch (deleteError) {
      this.logger.error(`Failed to delete invite after ${context}`, {
        inviteId: invite.id,
        email,
        error:
          deleteError instanceof Error ? deleteError.message : 'Unknown error',
      });
    }
  }

  private buildSuccessResult(
    inviteData: InviteData,
    url: string | null,
  ): BulkInviteResult {
    return {
      email: inviteData.email,
      role: inviteData.role,
      success: true,
      url,
      errorCode: null,
      errorMessage: null,
    };
  }

  private buildFailureResult(
    inviteData: InviteData,
    errorCode: string,
    errorMessage: string,
  ): BulkInviteResult {
    return {
      email: inviteData.email,
      role: inviteData.role,
      success: false,
      url: null,
      errorCode,
      errorMessage,
    };
  }
}
