import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrgAddonRecord } from './infrastructure/persistence/postgres/schema/org-addon.record';
import { OrgAddonRepository } from './application/ports/org-addon.repository';
import { PostgresOrgAddonRepository } from './infrastructure/persistence/postgres/org-addon.repository';

import { ListOrgAddonsUseCase } from './application/use-cases/list-org-addons/list-org-addons.use-case';
import { ActivateAddonUseCase } from './application/use-cases/activate-addon/activate-addon.use-case';
import { DeactivateAddonUseCase } from './application/use-cases/deactivate-addon/deactivate-addon.use-case';
import { IsAddonActiveUseCase } from './application/use-cases/is-addon-active/is-addon-active.use-case';

import { SuperAdminAddonsController } from './presenters/http/super-admin-addons.controller';
import { AddonsController } from './presenters/http/addons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrgAddonRecord])],
  controllers: [SuperAdminAddonsController, AddonsController],
  providers: [
    {
      provide: OrgAddonRepository,
      useClass: PostgresOrgAddonRepository,
    },
    ListOrgAddonsUseCase,
    ActivateAddonUseCase,
    DeactivateAddonUseCase,
    IsAddonActiveUseCase,
  ],
  // Exported so future feature modules can gate behavior on active add-ons.
  exports: [ListOrgAddonsUseCase, IsAddonActiveUseCase],
})
export class AddonsModule {}
