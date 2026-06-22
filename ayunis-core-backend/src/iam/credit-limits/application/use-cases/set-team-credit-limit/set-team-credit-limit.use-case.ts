import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import {
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from '../../credit-limits.errors';
import { SetTeamCreditLimitCommand } from './set-team-credit-limit.command';

// Upserts by (orgId, teamId), reusing the existing row's id so re-setting a
// limit updates rather than violates the unique index.
@Injectable()
export class SetTeamCreditLimitUseCase {
  private readonly logger = new Logger(SetTeamCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: SetTeamCreditLimitCommand): Promise<CreditLimit> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Setting team credit limit', {
      orgId,
      targetTeamId: command.targetTeamId,
      monthlyCredits: command.monthlyCredits,
    });

    try {
      if (
        !Number.isFinite(command.monthlyCredits) ||
        command.monthlyCredits < 0
      ) {
        throw new InvalidCreditLimitError(
          'monthlyCredits must be a number greater than or equal to 0',
          { monthlyCredits: command.monthlyCredits },
        );
      }

      const existing = await this.creditLimitRepository.findByTeamId(
        orgId,
        command.targetTeamId,
      );

      const limit = existing
        ? new CreditLimit({
            id: existing.id,
            orgId,
            scope: existing.scope,
            targetTeamId: command.targetTeamId,
            monthlyCredits: command.monthlyCredits,
            createdAt: existing.createdAt,
          })
        : CreditLimit.forTeam(
            orgId,
            command.targetTeamId,
            command.monthlyCredits,
          );

      return await this.creditLimitRepository.save(limit);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to set team credit limit', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
