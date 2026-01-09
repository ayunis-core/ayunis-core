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

interface ValidationError {
  row: number;
  email: string;
  errorCode: string;
  message: string;
}

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
    const errors: ValidationError[] = [];
    const emailProviderBlacklist =
      this.configService.get<string[]>('auth.emailProviderBlacklist') ?? [];

    // Check for duplicates within the request
    const emailCounts = new Map<string, number[]>();
    command.invites.forEach((invite, index) => {
      const email = invite.email.toLowerCase();
      const indices = emailCounts.get(email) || [];
      indices.push(index + 1); // 1-indexed row numbers
      emailCounts.set(email, indices);
    });

    const duplicateEmails: string[] = [];
    emailCounts.forEach((indices, email) => {
      if (indices.length > 1) {
        duplicateEmails.push(email);
        // Add error for all duplicate occurrences except the first
        indices.slice(1).forEach((rowIndex) => {
          errors.push({
            row: rowIndex,
            email,
            errorCode: 'DUPLICATE_EMAIL_IN_REQUEST',
            message: `Duplicate email in request (first occurrence at row ${indices[0]})`,
          });
        });
      }
    });

    // Get all unique emails for batch lookup
    const uniqueEmails = [
      ...new Set(command.invites.map((i) => i.email.toLowerCase())),
    ];

    // Batch check for existing invites
    const existingInvites = await this.invitesRepository.findByEmailsAndOrg(
      uniqueEmails,
      command.orgId,
    );
    const existingInviteEmails = new Set(
      existingInvites.map((i) => i.email.toLowerCase()),
    );

    // Batch check for existing users
    const existingUsers =
      await this.usersRepository.findManyByEmails(uniqueEmails);
    const existingUserEmails = new Set(
      existingUsers.map((u) => u.email.toLowerCase()),
    );

    // Validate each invite
    command.invites.forEach((invite, index) => {
      const rowNumber = index + 1;
      const email = invite.email.toLowerCase();

      // Skip if already marked as duplicate
      const isDuplicate =
        duplicateEmails.includes(email) &&
        emailCounts.get(email)![0] !== rowNumber;
      if (isDuplicate) {
        return;
      }

      // Check email provider blacklist
      const emailProvider = email.split('@')[1]?.split('.')[0];
      if (emailProvider && emailProviderBlacklist.includes(emailProvider)) {
        errors.push({
          row: rowNumber,
          email: invite.email,
          errorCode: 'EMAIL_PROVIDER_BLACKLISTED',
          message: 'Email provider is not allowed',
        });
        return;
      }

      // Check if email already has a pending invite
      if (existingInviteEmails.has(email)) {
        errors.push({
          row: rowNumber,
          email: invite.email,
          errorCode: 'EMAIL_ALREADY_INVITED',
          message: 'Email already has a pending invite',
        });
        return;
      }

      // Check if email is already a user
      if (existingUserEmails.has(email)) {
        errors.push({
          row: rowNumber,
          email: invite.email,
          errorCode: 'EMAIL_ALREADY_USER',
          message: 'Email is already registered as a user',
        });
        return;
      }
    });

    return errors;
  }

  private async handleSeatsForBulkInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<void> {
    const isCloud = this.configService.get<boolean>('app.isCloudHosted', false);
    if (!isCloud) {
      return;
    }

    let subscription: Awaited<
      ReturnType<GetActiveSubscriptionUseCase['execute']>
    > | null = null;

    try {
      subscription = await this.getActiveSubscriptionUseCase.execute(
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
        return;
      }
      throw error;
    }

    if (!subscription) {
      return;
    }

    const inviteCount = command.invites.length;

    if (subscription.availableSeats < 0) {
      throw new InvalidSeatsError({
        orgId: command.orgId,
        availableSeats: subscription.availableSeats,
      });
    }

    // If not enough seats, increase seat count
    if (subscription.availableSeats < inviteCount) {
      const additionalSeatsNeeded = inviteCount - subscription.availableSeats;
      await this.updateSeatsUseCase.execute(
        new UpdateSeatsCommand({
          orgId: command.orgId,
          requestingUserId: command.userId,
          noOfSeats:
            subscription.subscription.noOfSeats + additionalSeatsNeeded,
        }),
      );
    }
  }

  private async processInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<BulkInviteResult[]> {
    const results: BulkInviteResult[] = [];
    const hasEmailConfig = this.configService.get<boolean>('emails.hasConfig');
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const inviteAcceptEndpoint = this.configService.get<string>(
      'app.frontend.inviteAcceptEndpoint',
    );
    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );

    // Create all invite entities upfront
    const inviteExpiresAt = this.getInviteExpiresAt(validDuration);
    const invites: Invite[] = command.invites.map(
      (inviteData) =>
        new Invite({
          email: inviteData.email,
          orgId: command.orgId,
          role: inviteData.role,
          inviterId: command.userId,
          expiresAt: inviteExpiresAt,
        }),
    );

    // Batch insert all invites
    await this.invitesRepository.createMany(invites);

    this.logger.debug('Invites batch created successfully', {
      count: invites.length,
    });

    // Process each invite for token generation and email sending
    for (let i = 0; i < invites.length; i++) {
      const invite = invites[i];
      const inviteData = command.invites[i];

      try {
        // Generate JWT token for the invite
        const inviteToken = this.inviteJwtService.generateInviteToken({
          inviteId: invite.id,
        });

        const inviteAcceptUrl = `${frontendBaseUrl}${inviteAcceptEndpoint}?token=${inviteToken}`;

        // Send email if config is available
        if (hasEmailConfig) {
          try {
            await this.sendInvitationEmailUseCase.execute(
              new SendInvitationEmailCommand(invite, inviteAcceptUrl),
            );
            results.push({
              email: inviteData.email,
              role: inviteData.role,
              success: true,
              url: null,
              errorCode: null,
              errorMessage: null,
            });
          } catch (emailError) {
            this.logger.warn('Failed to send invitation email', {
              email: inviteData.email,
              error:
                emailError instanceof Error
                  ? emailError.message
                  : 'Unknown error',
            });

            // Delete the invite since email delivery failed
            try {
              await this.invitesRepository.delete(invite.id);
              this.logger.debug('Deleted invite after email sending failure', {
                inviteId: invite.id,
                email: inviteData.email,
              });
            } catch (deleteError) {
              this.logger.error('Failed to delete invite after email failure', {
                inviteId: invite.id,
                email: inviteData.email,
                error:
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Unknown error',
              });
            }

            results.push({
              email: inviteData.email,
              role: inviteData.role,
              success: false,
              url: null,
              errorCode: 'EMAIL_SENDING_FAILED',
              errorMessage:
                emailError instanceof Error
                  ? emailError.message
                  : 'Failed to send invitation email',
            });
          }
        } else {
          // No email config - return URL
          results.push({
            email: inviteData.email,
            role: inviteData.role,
            success: true,
            url: inviteAcceptUrl,
            errorCode: null,
            errorMessage: null,
          });
        }
      } catch (error) {
        this.logger.error('Failed to process invite', {
          email: inviteData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Delete the invite since processing failed
        try {
          await this.invitesRepository.delete(invite.id);
          this.logger.debug('Deleted invite after processing failure', {
            inviteId: invite.id,
            email: inviteData.email,
          });
        } catch (deleteError) {
          this.logger.error(
            'Failed to delete invite after processing failure',
            {
              inviteId: invite.id,
              email: inviteData.email,
              error:
                deleteError instanceof Error
                  ? deleteError.message
                  : 'Unknown error',
            },
          );
        }

        results.push({
          email: inviteData.email,
          role: inviteData.role,
          success: false,
          url: null,
          errorCode:
            error instanceof ApplicationError ? error.code : 'UNEXPECTED_ERROR',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private getInviteExpiresAt(inviteExpiresIn: string): Date {
    // Parse duration like "7d", "24h", "60m", "3600s"
    const match = inviteExpiresIn.match(/^(\d+)([dhms])$/);

    if (!match) {
      throw new Error(
        `Invalid invite expires in format: ${inviteExpiresIn}. Expected format: number + d/h/m/s (e.g., "7d", "24h")`,
      );
    }

    const [, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);

    let multiplier: number;
    switch (unit) {
      case 'd':
        multiplier = 24 * 60 * 60 * 1000; // days to milliseconds
        break;
      case 'h':
        multiplier = 60 * 60 * 1000; // hours to milliseconds
        break;
      case 'm':
        multiplier = 60 * 1000; // minutes to milliseconds
        break;
      case 's':
        multiplier = 1000; // seconds to milliseconds
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }

    return new Date(Date.now() + amount * multiplier);
  }
}
