import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import type { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import { AdventCalendarDoorMapper } from './mappers/advent-calendar-door.mapper';
import { AdventCalendarDoorRecord } from './schema/advent-calendar-door.record';

@Injectable()
export class LocalAdventCalendarDoorsRepository extends AdventCalendarDoorsRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get records(): Repository<AdventCalendarDoorRecord> {
    return this.txHost.tx.getRepository(AdventCalendarDoorRecord);
  }

  async findAll(): Promise<AdventCalendarDoor[]> {
    const records = await this.records.find({ order: { day: 'ASC' } });
    return records.map((record) => AdventCalendarDoorMapper.toDomain(record));
  }

  async findByDay(day: number): Promise<AdventCalendarDoor | null> {
    const record = await this.records.findOne({ where: { day } });
    return record ? AdventCalendarDoorMapper.toDomain(record) : null;
  }

  async findByDayForUpdate(day: number): Promise<AdventCalendarDoor | null> {
    const record = await this.records.findOne({
      where: { day },
      lock: { mode: 'pessimistic_write' },
    });
    return record ? AdventCalendarDoorMapper.toDomain(record) : null;
  }

  async save(door: AdventCalendarDoor): Promise<AdventCalendarDoor> {
    const result = await this.records
      .createQueryBuilder()
      .insert()
      .values(AdventCalendarDoorMapper.toColumns(door))
      .orUpdate(
        [
          'title',
          'body',
          'mediaType',
          'mediaStorageKey',
          'mediaContentType',
          'vimeoVideoId',
          'vimeoHash',
          'buttons',
          'updatedAt',
        ],
        ['day'],
      )
      .returning('*')
      .execute();
    const [raw] = result.raw as AdventCalendarDoorRecord[];
    return AdventCalendarDoorMapper.toDomain(raw);
  }

  async delete(day: number): Promise<AdventCalendarDoor | null> {
    const result = await this.records
      .createQueryBuilder()
      .delete()
      .where('day = :day', { day })
      .returning('*')
      .execute();
    const [raw] = result.raw as (AdventCalendarDoorRecord | undefined)[];
    return raw ? AdventCalendarDoorMapper.toDomain(raw) : null;
  }
}
