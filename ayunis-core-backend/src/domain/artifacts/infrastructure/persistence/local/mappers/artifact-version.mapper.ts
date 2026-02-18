import { Injectable } from '@nestjs/common';
import { ArtifactVersion } from '../../../../domain/artifact-version.entity';
import { ArtifactVersionRecord } from '../schema/artifact-version.record';

@Injectable()
export class ArtifactVersionMapper {
  toDomain(record: ArtifactVersionRecord): ArtifactVersion {
    return new ArtifactVersion({
      id: record.id,
      artifactId: record.artifactId,
      versionNumber: record.versionNumber,
      content: record.content,
      authorType: record.authorType,
      authorId: record.authorId,
      createdAt: record.createdAt,
    });
  }

  toRecord(domain: ArtifactVersion): ArtifactVersionRecord {
    const record = new ArtifactVersionRecord();
    record.id = domain.id;
    record.artifactId = domain.artifactId;
    record.versionNumber = domain.versionNumber;
    record.content = domain.content;
    record.authorType = domain.authorType;
    record.authorId = domain.authorId;
    return record;
  }
}
