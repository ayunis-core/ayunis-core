import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { In, Repository } from 'typeorm';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import type { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';
import { ReleaseNoteMapper } from './mappers/release-note.mapper';
import { ReleaseNoteRecord } from './schema/release-note.record';

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
}
