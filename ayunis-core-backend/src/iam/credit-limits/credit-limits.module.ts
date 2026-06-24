import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreditLimitRepository } from './application/ports/credit-limit.repository';
import { LocalCreditLimitRepository } from './infrastructure/persistence/local/local-credit-limit.repository';
import { CreditLimitRecord } from './infrastructure/persistence/local/schema/credit-limit.record';
import { CreditLimitMapper } from './infrastructure/persistence/local/mappers/credit-limit.mapper';

import { SetUserCreditLimitUseCase } from './application/use-cases/set-user-credit-limit/set-user-credit-limit.use-case';
import { SetTeamCreditLimitUseCase } from './application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { RemoveCreditLimitUseCase } from './application/use-cases/remove-credit-limit/remove-credit-limit.use-case';
import { ListCreditLimitsUseCase } from './application/use-cases/list-credit-limits/list-credit-limits.use-case';
import { GetCreditLimitsForUserUseCase } from './application/use-cases/get-credit-limits-for-user/get-credit-limits-for-user.use-case';
import { GetCreditLimitsOverviewUseCase } from './application/use-cases/get-credit-limits-overview/get-credit-limits-overview.use-case';

import { CreditLimitsController } from './presenters/http/credit-limits.controller';
import { CreditLimitDtoMapper } from './presenters/http/mappers/credit-limit-dto.mapper';

import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { UsageModule } from '../../domain/usage/usage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditLimitRecord]),
    TeamsModule,
    UsersModule,
    UsageModule,
    SubscriptionsModule,
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
    RemoveCreditLimitUseCase,
    ListCreditLimitsUseCase,
    GetCreditLimitsForUserUseCase,
    GetCreditLimitsOverviewUseCase,
  ],
  exports: [
    SetUserCreditLimitUseCase,
    SetTeamCreditLimitUseCase,
    RemoveCreditLimitUseCase,
    ListCreditLimitsUseCase,
    GetCreditLimitsForUserUseCase,
    GetCreditLimitsOverviewUseCase,
  ],
})
export class CreditLimitsModule {}
