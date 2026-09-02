import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageModule } from 'src/domain/usage/usage.module';
import { ApiKeysModule } from 'src/iam/api-keys/api-keys.module';
import { TeamsModule } from 'src/iam/teams/teams.module';
import { UsersModule } from 'src/iam/users/users.module';
import { SubscriptionCancelledListener } from './application/listeners/subscription-cancelled.listener';
import { CreditLimitRepository } from './application/ports/credit-limit.repository';
import { GetApiKeyCreditLimitsOverviewUseCase } from './application/use-cases/get-api-key-credit-limits-overview/get-api-key-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from './application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { GetUserCreditLimitsOverviewUseCase } from './application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { RemoveApiKeyCreditLimitUseCase } from './application/use-cases/remove-api-key-credit-limit/remove-api-key-credit-limit.use-case';
import { RemoveOrgCreditLimitsUseCase } from './application/use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';
import { RemoveTeamCreditLimitUseCase } from './application/use-cases/remove-team-credit-limit/remove-team-credit-limit.use-case';
import { RemoveUserCreditLimitUseCase } from './application/use-cases/remove-user-credit-limit/remove-user-credit-limit.use-case';
import { ResolveCreditLimitForApiKeyUseCase } from './application/use-cases/resolve-credit-limit-for-api-key/resolve-credit-limit-for-api-key.use-case';
import { ResolveCreditLimitsForUserUseCase } from './application/use-cases/resolve-credit-limits-for-user/resolve-credit-limits-for-user.use-case';
import { SetApiKeyCreditLimitUseCase } from './application/use-cases/set-api-key-credit-limit/set-api-key-credit-limit.use-case';
import { SetTeamCreditLimitUseCase } from './application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { SetUserCreditLimitUseCase } from './application/use-cases/set-user-credit-limit/set-user-credit-limit.use-case';
import { CreditLimitMapper } from './infrastructure/persistence/local/mappers/credit-limit.mapper';
import { LocalCreditLimitRepository } from './infrastructure/persistence/local/local-credit-limit.repository';
import {
  ApiKeyCreditLimitRecord,
  CreditLimitRecord,
  TeamCreditLimitRecord,
  UserCreditLimitRecord,
} from './infrastructure/persistence/local/schema/credit-limit.record';
import { CreditLimitsController } from './presenters/http/credit-limits.controller';
import { CreditLimitDtoMapper } from './presenters/http/mappers/credit-limit-dto.mapper';

const apiKeyCreditLimitUseCases = [
  SetApiKeyCreditLimitUseCase,
  RemoveApiKeyCreditLimitUseCase,
  ResolveCreditLimitForApiKeyUseCase,
  GetApiKeyCreditLimitsOverviewUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditLimitRecord,
      UserCreditLimitRecord,
      TeamCreditLimitRecord,
      ApiKeyCreditLimitRecord,
    ]),
    ApiKeysModule,
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
    ...apiKeyCreditLimitUseCases,
  ],
  exports: [
    SetUserCreditLimitUseCase,
    SetTeamCreditLimitUseCase,
    RemoveUserCreditLimitUseCase,
    RemoveTeamCreditLimitUseCase,
    ResolveCreditLimitsForUserUseCase,
    GetUserCreditLimitsOverviewUseCase,
    GetTeamCreditLimitsOverviewUseCase,
    ...apiKeyCreditLimitUseCases,
  ],
})
export class CreditLimitsModule {}
