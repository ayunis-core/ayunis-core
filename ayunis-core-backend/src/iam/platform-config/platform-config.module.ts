import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConfigRecord } from './infrastructure/persistence/postgres/schema/platform-config.record';
import { PlatformConfigRepositoryPort } from './application/ports/platform-config.repository';
import { PlatformConfigRepository } from './infrastructure/persistence/postgres/platform-config.repository';
import { GetCreditsPerEuroUseCase } from './application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import { SetCreditsPerEuroUseCase } from './application/use-cases/set-credits-per-euro/set-credits-per-euro.use-case';
import { GetFairUseLimitsUseCase } from './application/use-cases/get-fair-use-limits/get-fair-use-limits.use-case';
import { SetFairUseLimitUseCase } from './application/use-cases/set-fair-use-limit/set-fair-use-limit.use-case';
import { SetImageFairUseLimitUseCase } from './application/use-cases/set-image-fair-use-limit/set-image-fair-use-limit.use-case';
import { GetAppAlertUseCase } from './application/use-cases/get-app-alert/get-app-alert.use-case';
import { SetAppAlertUseCase } from './application/use-cases/set-app-alert/set-app-alert.use-case';
import { SuperAdminPlatformConfigController } from './presenters/http/super-admin-platform-config.controller';
import { AppAlertController } from './presenters/http/app-alert.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformConfigRecord])],
  controllers: [SuperAdminPlatformConfigController, AppAlertController],
  providers: [
    {
      provide: PlatformConfigRepositoryPort,
      useClass: PlatformConfigRepository,
    },
    GetCreditsPerEuroUseCase,
    SetCreditsPerEuroUseCase,
    GetFairUseLimitsUseCase,
    SetFairUseLimitUseCase,
    SetImageFairUseLimitUseCase,
    GetAppAlertUseCase,
    SetAppAlertUseCase,
  ],
  exports: [
    GetCreditsPerEuroUseCase,
    GetFairUseLimitsUseCase,
    GetAppAlertUseCase,
  ],
})
export class PlatformConfigModule {}
