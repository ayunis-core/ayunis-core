import { Injectable } from '@nestjs/common';
import { Artifact } from '../../../../domain/artifact.entity';
import { ArtifactRecord } from '../schema/artifact.record';
import { ArtifactVersionMapper } from './artifact-version.mapper';

@Injectable()
export class ArtifactMapper {
  constructor(private readonly versionMapper: ArtifactVersionMapper) {}

  toDomain(record: ArtifactRecord): Artifact {
    return new Artifact({
      id: record.id,
      threadId: record.threadId,
      userId: record.userId,
      title: record.title,
      letterheadId: record.letterheadId,
      currentVersionNumber: record.currentVersionNumber,
      versions: record.versions?.map((v) => this.versionMapper.toDomain(v)),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: Artifact): ArtifactRecord {
    const record = new ArtifactRecord();
    record.id = domain.id;
    record.threadId = domain.threadId;
    record.userId = domain.userId;
    record.title = domain.title;
    record.letterheadId = domain.letterheadId;
    record.currentVersionNumber = domain.currentVersionNumber;
    record.versions = domain.versions?.map((v) =>
      this.versionMapper.toRecord(v),
    );
    return record;
  }
}
