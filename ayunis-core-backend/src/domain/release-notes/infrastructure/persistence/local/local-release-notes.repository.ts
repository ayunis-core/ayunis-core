import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type {
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { In, Repository } from 'typeorm';
import type { UserReleaseNote } from 'src/domain/release-notes/application/models/user-release-note';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import type { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { ReleaseNoteMapper } from './mappers/release-note.mapper';
import { ReleaseNoteReadRecord } from './schema/release-note-read.record';
import { ReleaseNoteRecord } from './schema/release-note.record';

const UNREAD =
  'note.announced AND note.createdAt > reader.createdAt AND read.id IS NULL';

@Injectable()
export class LocalReleaseNotesRepository extends ReleaseNotesRepository {
  constructor(
    @InjectRepository(ReleaseNoteRecord)
    private readonly defaultRepo: Repository<ReleaseNoteRecord>,
    private readonly mapper: ReleaseNoteMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repo(): Repository<ReleaseNoteRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(ReleaseNoteRecord) ?? this.defaultRepo;
  }

  async findAll(): Promise<ReleaseNote[]> {
    const records = await this.repo.find();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async insertMany(notes: ReleaseNote[]): Promise<void> {
    if (notes.length === 0) return;
    await this.repo.insert(notes.map((note) => this.mapper.toRecord(note)));
  }

  async update(note: ReleaseNote): Promise<void> {
    const { id, ...fields } = this.mapper.toRecord(note);
    await this.repo.update({ id }, fields);
  }

  async deleteByIds(ids: UUID[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repo.delete({ id: In(ids) });
  }

  async findNewestForUser(
    userId: UUID,
    limit: number,
  ): Promise<UserReleaseNote[]> {
    const query = newestFirst(this.forUser(userId), 'note').limit(limit);
    return this.toUserReleaseNotes(query);
  }

  async findOneForUser(
    userId: UUID,
    id: UUID,
  ): Promise<UserReleaseNote | null> {
    const query = this.forUser(userId).andWhere('note.id = :id', { id });
    return (await this.toUserReleaseNotes(query)).at(0) ?? null;
  }

  countUnread(userId: UUID, limit: number): Promise<number> {
    const listed = newestFirst(
      this.repo.createQueryBuilder('listed').select('listed.id'),
      'listed',
    ).limit(limit);
    return this.forUser(userId)
      .andWhere(UNREAD)
      .andWhere(`note.id IN (${listed.getQuery()})`)
      .getCount();
  }

  async markRead(userId: UUID, id: UUID): Promise<void> {
    const manager = this.repo.manager;
    // Selecting from the notes makes a note deleted meanwhile a no-op rather
    // than a foreign-key error.
    await manager.query(
      `INSERT INTO ${tablePath(manager, ReleaseNoteReadRecord)}
         ("id", "userId", "releaseNoteId")
       SELECT gen_random_uuid(), $1, note."id"
       FROM ${tablePath(manager, ReleaseNoteRecord)} note
       WHERE note."id" = $2
       ON CONFLICT ("userId", "releaseNoteId") DO NOTHING`,
      [userId, id],
    );
  }

  /** Notes with the reader's row and their read mark, if any, joined in. */
  private forUser(userId: UUID): SelectQueryBuilder<ReleaseNoteRecord> {
    return this.repo
      .createQueryBuilder('note')
      .innerJoin(UserRecord, 'reader', 'reader.id = :userId', { userId })
      .leftJoin(
        ReleaseNoteReadRecord,
        'read',
        'read.releaseNoteId = note.id AND read.userId = reader.id',
      )
      .addSelect(UNREAD, 'unread');
  }

  private async toUserReleaseNotes(
    query: SelectQueryBuilder<ReleaseNoteRecord>,
  ): Promise<UserReleaseNote[]> {
    const { entities, raw } = await query.getRawAndEntities<{
      unread: boolean;
    }>();
    return entities.map((record, index) => ({
      note: this.mapper.toDomain(record),
      unread: raw[index].unread,
    }));
  }
}

/** By the date shown: Announcable's, else the day the note was synced. */
function newestFirst(
  query: SelectQueryBuilder<ReleaseNoteRecord>,
  alias: string,
): SelectQueryBuilder<ReleaseNoteRecord> {
  return query
    .orderBy(
      `COALESCE(${alias}.publishedOn, CAST(${alias}.createdAt AS date))`,
      'DESC',
    )
    .addOrderBy(`${alias}.createdAt`, 'DESC')
    .addOrderBy(`${alias}.id`, 'DESC');
}

/** The table of a record, quoted and with its schema when it has one. */
function tablePath(
  manager: EntityManager,
  record: EntityTarget<ObjectLiteral>,
): string {
  const { schema, tableName } = manager.connection.getMetadata(record);
  const { driver } = manager.connection;
  return [schema, tableName]
    .filter((part): part is string => Boolean(part))
    .map((part) => driver.escape(part))
    .join('.');
}
