import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { StorageModule } from 'src/domain/storage/storage.module';
import { AnnouncableFeed } from './application/ports/announcable-feed.port';
import { ReleaseNotesRepository } from './application/ports/release-notes.repository';
import { ReleaseNoteMediaService } from './application/services/release-note-media.service';
import { CountUnreadReleaseNotesUseCase } from './application/use-cases/count-unread-release-notes/count-unread-release-notes.use-case';
import { DownloadReleaseNoteImageUseCase } from './application/use-cases/download-release-note-image/download-release-note-image.use-case';
import { FindMyReleaseNotesUseCase } from './application/use-cases/find-my-release-notes/find-my-release-notes.use-case';
import { FindReleaseNoteUseCase } from './application/use-cases/find-release-note/find-release-note.use-case';
import { MarkReleaseNoteReadUseCase } from './application/use-cases/mark-release-note-read/mark-release-note-read.use-case';
import { SyncReleaseNotesUseCase } from './application/use-cases/sync-release-notes/sync-release-notes.use-case';
import { AnnouncableHttpFeed } from './infrastructure/announcable/announcable-http.feed';
import { LocalReleaseNotesRepositoryModule } from './infrastructure/persistence/local/local-release-notes-repository.module';
import { LocalReleaseNotesRepository } from './infrastructure/persistence/local/local-release-notes.repository';
import { RELEASE_NOTE_SYNC_QUEUE } from './infrastructure/queue/release-note-sync.constants';
import { ReleaseNoteSyncConsumer } from './infrastructure/queue/release-note-sync.consumer';
import { ReleaseNoteDtoMapper } from './presenters/http/mappers/release-note-dto.mapper';
import { ReleaseNotesController } from './presenters/http/release-notes.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: RELEASE_NOTE_SYNC_QUEUE }),
    LocalReleaseNotesRepositoryModule,
    StorageModule,
  ],
  controllers: [ReleaseNotesController],
  providers: [
    {
      provide: ReleaseNotesRepository,
      useExisting: LocalReleaseNotesRepository,
    },
    { provide: AnnouncableFeed, useClass: AnnouncableHttpFeed },
    ReleaseNoteMediaService,
    SyncReleaseNotesUseCase,
    ReleaseNoteSyncConsumer,
    FindMyReleaseNotesUseCase,
    FindReleaseNoteUseCase,
    CountUnreadReleaseNotesUseCase,
    MarkReleaseNoteReadUseCase,
    DownloadReleaseNoteImageUseCase,
    ReleaseNoteDtoMapper,
  ],
  exports: [FindReleaseNoteUseCase],
})
export class ReleaseNotesModule {}
