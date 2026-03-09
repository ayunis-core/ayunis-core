import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConfigRecord } from './infrastructure/persistence/postgres/schema/platform-config.record';
import { PlatformConfigRepositoryPort } from './application/ports/platform-config.repository';
import { PlatformConfigRepository } from './infrastructure/persistence/postgres/platform-config.repository';
import { GetCreditsPerEuroUseCase } from './application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import { SetCreditsPerEuroUseCase } from './application/use-cases/set-credits-per-euro/set-credits-per-euro.use-case';
import { SuperAdminPlatformConfigController } from './presenters/http/super-admin-platform-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformConfigRecord])],
  controllers: [SuperAdminPlatformConfigController],
  providers: [
    {
      provide: PlatformConfigRepositoryPort,
      useClass: PlatformConfigRepository,
    },
    GetCreditsPerEuroUseCase,
    SetCreditsPerEuroUseCase,
  ],
  exports: [GetCreditsPerEuroUseCase],
})
export class PlatformConfigModule {}
