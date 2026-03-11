import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtifactRecord } from './schema/artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { LocalArtifactsRepository } from './local-artifacts.repository';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([ArtifactRecord, ArtifactVersionRecord])],
  providers: [LocalArtifactsRepository, ArtifactMapper, ArtifactVersionMapper],
  exports: [LocalArtifactsRepository],
})
export class LocalArtifactsRepositoryModule {}
