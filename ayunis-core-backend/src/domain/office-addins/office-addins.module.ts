import { Module } from '@nestjs/common';
import { GetOutlookManifestUseCase } from './application/use-cases/get-outlook-manifest/get-outlook-manifest.use-case';
import { OfficeAddinsController } from './presenters/http/office-addins.controller';

@Module({
  controllers: [OfficeAddinsController],
  providers: [GetOutlookManifestUseCase],
})
export class OfficeAddinsModule {}
