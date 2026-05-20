import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from 'src/domain/storage/storage.module';
import { OrgsModule } from '../orgs/orgs.module';

import { BrandingRecord } from './infrastructure/persistence/postgres/schema/branding.record';
import { BrandingRepository } from './application/ports/branding.repository';
import { PostgresBrandingRepository } from './infrastructure/persistence/postgres/branding.repository';

import { GetBrandingUseCase } from './application/use-cases/get-branding/get-branding.use-case';
import { UpdateBrandingUseCase } from './application/use-cases/update-branding/update-branding.use-case';

import { BrandingController } from './presenters/http/branding.controller';
import { SuperAdminBrandingController } from './presenters/http/super-admin-branding.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BrandingRecord]),
    StorageModule,
    OrgsModule,
  ],
  controllers: [BrandingController, SuperAdminBrandingController],
  providers: [
    {
      provide: BrandingRepository,
      useClass: PostgresBrandingRepository,
    },
    GetBrandingUseCase,
    UpdateBrandingUseCase,
  ],
  exports: [GetBrandingUseCase, UpdateBrandingUseCase],
})
export class BrandingModule {}
