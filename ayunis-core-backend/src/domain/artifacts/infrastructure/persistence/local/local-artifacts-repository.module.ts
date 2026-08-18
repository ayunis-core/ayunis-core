import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtifactRecord } from './schema/artifact.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';
import { DiagramArtifactRecord } from './schema/diagram-artifact.record';
import { SpreadsheetArtifactRecord } from './schema/spreadsheet-artifact.record';
import { EmailArtifactRecord } from './schema/email-artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { LocalArtifactsRepository } from './local-artifacts.repository';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';
import { EmailDeliveryRecord } from './schema/email-delivery.record';
import { LocalEmailDeliveryRepository } from './local-email-delivery.repository';
import { EmailDeliveryMapper } from './mappers/email-delivery.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ArtifactRecord,
      DocumentArtifactRecord,
      DiagramArtifactRecord,
      SpreadsheetArtifactRecord,
      EmailArtifactRecord,
      ArtifactVersionRecord,
      EmailDeliveryRecord,
    ]),
  ],
  providers: [
    LocalArtifactsRepository,
    LocalEmailDeliveryRepository,
    ArtifactMapper,
    ArtifactVersionMapper,
    EmailDeliveryMapper,
  ],
  exports: [LocalArtifactsRepository, LocalEmailDeliveryRepository],
})
export class LocalArtifactsRepositoryModule {}
