import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseNoteRecord } from './schema/release-note.record';
import { LocalReleaseNotesRepository } from './local-release-notes.repository';
import { ReleaseNoteMapper } from './mappers/release-note.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([ReleaseNoteRecord])],
  providers: [LocalReleaseNotesRepository, ReleaseNoteMapper],
  exports: [LocalReleaseNotesRepository],
})
export class LocalReleaseNotesRepositoryModule {}
