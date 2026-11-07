import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';
import { AnnouncableFeed } from 'src/domain/release-notes/application/ports/announcable-feed.port';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import { UnexpectedReleaseNoteError } from 'src/domain/release-notes/application/release-notes.errors';
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
 * Makes the stored release notes match the Announcable feed. Everything
 * that talks to Announcable or object storage happens before or after the
 * one transaction that writes the notes, so no connection is held across a
 * request and a failed download leaves the stored notes untouched.
 */
@Injectable()
export class SyncReleaseNotesUseCase {
  private readonly logger = new Logger(SyncReleaseNotesUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly feed: AnnouncableFeed,
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly mediaService: ReleaseNoteMediaService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(): Promise<ReleaseNoteSyncResult | null> {
    const orgId = this.configService.get<string | null>(
      'releaseNotes.announcableOrgId',
    );
    if (!orgId) {
      this.logger.log('No Announcable org ID, not syncing release notes');
      return null;
    }
    this.logger.log({ announcableOrgId: orgId }, 'Syncing release notes');
    const feedNotes = await this.feed.fetchReleaseNotes(orgId);
    const stored = await this.releaseNotesRepository.findAll();
    const changes = await this.prepareChanges(feedNotes, stored);
    await this.applyChanges(changes);
    await this.mediaService.removeUnusedImages(changes.kept);
    const result: ReleaseNoteSyncResult = {
      inserted: changes.inserts.length,
      updated: changes.updates.length,
      deleted: changes.deletes.length,
      unchanged: changes.unchanged,
      skipped: changes.skipped,
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

  @Transactional()
  private async applyChanges(changes: ReleaseNoteChanges): Promise<void> {
    await this.releaseNotesRepository.insertMany(changes.inserts);
    for (const note of changes.updates) {
      await this.releaseNotesRepository.update(note);
    }
    await this.releaseNotesRepository.deleteByIds(
      changes.deletes.map((note) => note.id),
    );
  }
}
