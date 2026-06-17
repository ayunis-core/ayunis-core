import { Injectable } from '@nestjs/common';
import { Letterhead } from '../../../../domain/letterhead.entity';
import { LetterheadRecord } from '../schema/letterhead.record';

@Injectable()
export class LetterheadMapper {
  toDomain(record: LetterheadRecord): Letterhead {
    return new Letterhead({
      id: record.id,
      orgId: record.orgId,
      name: record.name,
      description: record.description,
      firstPageStoragePath: record.firstPageStoragePath,
      continuationPageStoragePath: record.continuationPageStoragePath,
      firstPageMargins: record.firstPageMargins,
      continuationPageMargins: record.continuationPageMargins,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: Letterhead): LetterheadRecord {
    const record = new LetterheadRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.name = domain.name;
    record.description = domain.description;
    record.firstPageStoragePath = domain.firstPageStoragePath;
    record.continuationPageStoragePath = domain.continuationPageStoragePath;
    record.firstPageMargins = domain.firstPageMargins;
    record.continuationPageMargins = domain.continuationPageMargins;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
