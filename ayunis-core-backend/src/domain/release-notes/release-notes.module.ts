import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { StorageModule } from 'src/domain/storage/storage.module';
import { AnnouncableFeed } from './application/ports/announcable-feed.port';
import { ReleaseNotesRepository } from './application/ports/release-notes.repository';
import { ReleaseNoteMediaService } from './application/services/release-note-media.service';
import { SyncReleaseNotesUseCase } from './application/use-cases/sync-release-notes/sync-release-notes.use-case';
import { AnnouncableHttpFeed } from './infrastructure/announcable/announcable-http.feed';
import { LocalReleaseNotesRepositoryModule } from './infrastructure/persistence/local/local-release-notes-repository.module';
import { LocalReleaseNotesRepository } from './infrastructure/persistence/local/local-release-notes.repository';
import { RELEASE_NOTE_SYNC_QUEUE } from './infrastructure/queue/release-note-sync.constants';
import { ReleaseNoteSyncConsumer } from './infrastructure/queue/release-note-sync.consumer';

@Module({
  imports: [
    BullModule.registerQueue({ name: RELEASE_NOTE_SYNC_QUEUE }),
    LocalReleaseNotesRepositoryModule,
    StorageModule,
  ],
  providers: [
    {
      provide: ReleaseNotesRepository,
      useExisting: LocalReleaseNotesRepository,
    },
    { provide: AnnouncableFeed, useClass: AnnouncableHttpFeed },
    ReleaseNoteMediaService,
    SyncReleaseNotesUseCase,
    ReleaseNoteSyncConsumer,
  ],
})
export class ReleaseNotesModule {}
