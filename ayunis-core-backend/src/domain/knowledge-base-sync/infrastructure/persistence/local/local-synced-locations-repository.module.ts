import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { LocalSyncedLocationsRepository } from './local-synced-locations.repository';
import { SyncedFileMapper } from './mappers/synced-file.mapper';
import { SyncedLocationMapper } from './mappers/synced-location.mapper';
import { SyncedFileRecord } from './schema/synced-file.record';
import { SyncedLocationRecord } from './schema/synced-location.record';

@Module({
  imports: [TypeOrmModule.forFeature([SyncedLocationRecord, SyncedFileRecord])],
  providers: [
    SyncedLocationMapper,
    SyncedFileMapper,
    {
      provide: SyncedLocationsRepository,
      useClass: LocalSyncedLocationsRepository,
    },
  ],
  exports: [SyncedLocationsRepository],
})
export class LocalSyncedLocationsRepositoryModule {}
