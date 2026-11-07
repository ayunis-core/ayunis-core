import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { ReleaseNoteNotificationContent } from 'src/domain/notifications/application/models/release-note-notification-content';
import { NotifyUsersOfReleaseNoteCommand } from 'src/domain/notifications/application/use-cases/notify-users-of-release-note/notify-users-of-release-note.command';
import { NotifyUsersOfReleaseNoteUseCase } from 'src/domain/notifications/application/use-cases/notify-users-of-release-note/notify-users-of-release-note.use-case';
import { UpdateReleaseNoteNotificationsCommand } from 'src/domain/notifications/application/use-cases/update-release-note-notifications/update-release-note-notifications.command';
import { UpdateReleaseNoteNotificationsUseCase } from 'src/domain/notifications/application/use-cases/update-release-note-notifications/update-release-note-notifications.use-case';
import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';
import { AnnouncableFeed } from 'src/domain/release-notes/application/ports/announcable-feed.port';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import {
  AnnouncableFeedInvalidError,
  UnexpectedReleaseNoteError,
} from 'src/domain/release-notes/application/release-notes.errors';
import { ReleaseNoteMediaService } from 'src/domain/release-notes/application/services/release-note-media.service';
import { releaseNoteText } from 'src/domain/release-notes/application/util/release-note-content.helper';
import { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';

export interface ReleaseNoteSyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
  /** Notes that cannot become a notification; an edited one stays as stored. */
  skipped: number;
  /** Notifications sent for the inserted notes. */
  notified: number;
}

interface ReleaseNoteChanges {
  inserts: ReleaseNote[];
  updates: ReleaseNote[];
  deletes: ReleaseNote[];
  /** Every note stored once the changes are applied. */
  kept: ReleaseNote[];
  unchanged: number;
  skipped: number;
}

/**
 * Makes the stored release notes and their notifications match the
 * Announcable feed. Everything that talks to Announcable or object storage
 * happens before or after the one transaction that writes the notes and
 * notifications, so no connection is held across a request and a failed
 * download leaves both untouched.
 */
@Injectable()
export class SyncReleaseNotesUseCase {
  private readonly logger = new Logger(SyncReleaseNotesUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly feed: AnnouncableFeed,
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly mediaService: ReleaseNoteMediaService,
    private readonly notifyUsersOfReleaseNote: NotifyUsersOfReleaseNoteUseCase,
    private readonly updateReleaseNoteNotifications: UpdateReleaseNoteNotificationsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(): Promise<ReleaseNoteSyncResult | null> {
    const orgId = this.configService.get<string | null>(
      'releaseNotes.announcableOrgId',
    );
    if (
      !this.configService.get<boolean>('features.releaseNotesEnabled') ||
      !orgId
    ) {
      this.logger.log('Release notes are off, not syncing them');
      return null;
    }
    this.logger.log({ announcableOrgId: orgId }, 'Syncing release notes');
    const feedNotes = await this.feed.fetchReleaseNotes(orgId);
    const stored = await this.releaseNotesRepository.findAll();
    if (feedNotes.length === 0 && stored.length > 0) {
      // Announcable losing its notes is likelier than all being deleted.
      throw new AnnouncableFeedInvalidError(
        `no notes while ${stored.length} are stored`,
      );
    }
    const changes = await this.prepareChanges(feedNotes, stored);
    // Without stored notes this is the first sync: the feed is old news.
    const notified = await this.applyChanges(changes, stored.length > 0);
    await this.mediaService.removeUnusedImages(changes.kept);
    const result: ReleaseNoteSyncResult = {
      inserted: changes.inserts.length,
      updated: changes.updates.length,
      deleted: changes.deletes.length,
      unchanged: changes.unchanged,
      skipped: changes.skipped,
      notified,
    };
    this.logger.log(result, 'Synced release notes');
    return result;
  }

  private async prepareChanges(
    feedNotes: AnnouncableReleaseNote[],
    stored: ReleaseNote[],
  ): Promise<ReleaseNoteChanges> {
    const storedById = new Map(stored.map((n) => [n.announcableId, n]));
    const feedIds = new Set(feedNotes.map((note) => note.id));
    const changes: ReleaseNoteChanges = {
      inserts: [],
      updates: [],
      deletes: stored.filter((note) => !feedIds.has(note.announcableId)),
      kept: [],
      unchanged: 0,
      skipped: 0,
    };
    for (const feedNote of feedNotes) {
      const existing = storedById.get(feedNote.id) ?? null;
      if (existing?.lastUpdateOn === feedNote.lastUpdateOn) {
        changes.unchanged++;
        changes.kept.push(existing);
        continue;
      }
      const next = await this.toReleaseNote(feedNote, existing);
      if (!next) {
        changes.skipped++;
        if (existing) changes.kept.push(existing);
        continue;
      }
      (existing ? changes.updates : changes.inserts).push(next);
      changes.kept.push(next);
    }
    return changes;
  }

  private async toReleaseNote(
    feedNote: AnnouncableReleaseNote,
    existing: ReleaseNote | null,
  ): Promise<ReleaseNote | null> {
    const text = releaseNoteText(feedNote);
    if ('violation' in text) {
      this.logger.warn(
        { announcableId: feedNote.id, reason: text.violation },
        'Skipping release note',
      );
      return null;
    }
    const { media, imageSourcePath } = await this.mediaService.resolve(
      feedNote,
      existing,
    );
    return new ReleaseNote({
      id: existing?.id,
      announcableId: feedNote.id,
      headline: text.headline,
      body: text.body,
      media,
      imageSourcePath,
      lastUpdateOn: feedNote.lastUpdateOn,
    });
  }

  /**
   * Deleting a note deletes its notifications (foreign key). Returns how
   * many notifications were sent.
   */
  @Transactional()
  private async applyChanges(
    changes: ReleaseNoteChanges,
    notifyUsers: boolean,
  ): Promise<number> {
    await this.releaseNotesRepository.insertMany(changes.inserts);
    let notified = 0;
    for (const note of notifyUsers ? changes.inserts : []) {
      notified += await this.notifyUsersOfReleaseNote.execute(
        new NotifyUsersOfReleaseNoteCommand(notificationContent(note)),
      );
    }
    for (const note of changes.updates) {
      await this.releaseNotesRepository.update(note);
      await this.updateReleaseNoteNotifications.execute(
        new UpdateReleaseNoteNotificationsCommand(notificationContent(note)),
      );
    }
    await this.releaseNotesRepository.deleteByIds(
      changes.deletes.map((note) => note.id),
    );
    return notified;
  }
}

function notificationContent(
  note: ReleaseNote,
): ReleaseNoteNotificationContent {
  return {
    releaseNoteId: note.id,
    headline: note.headline,
    body: note.body,
    media: note.media,
  };
}
