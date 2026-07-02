import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreditLimitRepository } from './application/ports/credit-limit.repository';
import { LocalCreditLimitRepository } from './infrastructure/persistence/local/local-credit-limit.repository';
import {
  CreditLimitRecord,
  UserCreditLimitRecord,
  TeamCreditLimitRecord,
} from './infrastructure/persistence/local/schema/credit-limit.record';
import { CreditLimitMapper } from './infrastructure/persistence/local/mappers/credit-limit.mapper';

import { SetUserCreditLimitUseCase } from './application/use-cases/set-user-credit-limit/set-user-credit-limit.use-case';
import { SetTeamCreditLimitUseCase } from './application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { RemoveUserCreditLimitUseCase } from './application/use-cases/remove-user-credit-limit/remove-user-credit-limit.use-case';
import { RemoveTeamCreditLimitUseCase } from './application/use-cases/remove-team-credit-limit/remove-team-credit-limit.use-case';
import { ResolveCreditLimitsForUserUseCase } from './application/use-cases/resolve-credit-limits-for-user/resolve-credit-limits-for-user.use-case';
import { GetUserCreditLimitsOverviewUseCase } from './application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from './application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { RemoveOrgCreditLimitsUseCase } from './application/use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';
import { SubscriptionCancelledListener } from './application/listeners/subscription-cancelled.listener';

import { CreditLimitsController } from './presenters/http/credit-limits.controller';
import { CreditLimitDtoMapper } from './presenters/http/mappers/credit-limit-dto.mapper';

import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { UsageModule } from '../../domain/usage/usage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditLimitRecord,
      UserCreditLimitRecord,
      TeamCreditLimitRecord,
    ]),
    TeamsModule,
    UsersModule,
    UsageModule,
  ],
  controllers: [CreditLimitsController],
  providers: [
    {
      provide: CreditLimitRepository,
      useClass: LocalCreditLimitRepository,
    },
    CreditLimitMapper,
    CreditLimitDtoMapper,
    SetUserCreditLimitUseCase,
    SetTeamCreditLimitUseCase,
    RemoveUserCreditLimitUseCase,
    RemoveTeamCreditLimitUseCase,
    ResolveCreditLimitsForUserUseCase,
    GetUserCreditLimitsOverviewUseCase,
    GetTeamCreditLimitsOverviewUseCase,
    RemoveOrgCreditLimitsUseCase,
    SubscriptionCancelledListener,
  ],
  exports: [
    SetUserCreditLimitUseCase,
    SetTeamCreditLimitUseCase,
    RemoveUserCreditLimitUseCase,
    RemoveTeamCreditLimitUseCase,
    ResolveCreditLimitsForUserUseCase,
    GetUserCreditLimitsOverviewUseCase,
    GetTeamCreditLimitsOverviewUseCase,
  ],
})
export class CreditLimitsModule {}
