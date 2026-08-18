import { Injectable } from '@nestjs/common';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  EmailArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactRecord } from '../schema/artifact.record';
import { DocumentArtifactRecord } from '../schema/document-artifact.record';
import { DiagramArtifactRecord } from '../schema/diagram-artifact.record';
import { SpreadsheetArtifactRecord } from '../schema/spreadsheet-artifact.record';
import { EmailArtifactRecord } from '../schema/email-artifact.record';
import { ArtifactVersionMapper } from './artifact-version.mapper';

@Injectable()
export class ArtifactMapper {
  constructor(private readonly versionMapper: ArtifactVersionMapper) {}

  toDomain(record: DocumentArtifactRecord): DocumentArtifact;
  toDomain(record: DiagramArtifactRecord): DiagramArtifact;
  toDomain(record: SpreadsheetArtifactRecord): SpreadsheetArtifact;
  toDomain(record: EmailArtifactRecord): EmailArtifact;
  toDomain(record: ArtifactRecord): Artifact;
  toDomain(record: ArtifactRecord): Artifact {
    const base = this.toDomainBase(record);
    if (record instanceof DocumentArtifactRecord) {
      return new DocumentArtifact({
        ...base,
        letterheadId: record.letterheadId,
      });
    }
    if (record instanceof DiagramArtifactRecord) {
      return new DiagramArtifact(base);
    }
    if (record instanceof SpreadsheetArtifactRecord) {
      return new SpreadsheetArtifact(base);
    }
    if (record instanceof EmailArtifactRecord) {
      return new EmailArtifact(base);
    }
    throw new Error('Invalid artifact record type');
  }

  toRecord(domain: DocumentArtifact): DocumentArtifactRecord;
  toRecord(domain: DiagramArtifact): DiagramArtifactRecord;
  toRecord(domain: SpreadsheetArtifact): SpreadsheetArtifactRecord;
  toRecord(domain: EmailArtifact): EmailArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord {
    const record = this.createRecord(domain);
    record.id = domain.id;
    record.threadId = domain.threadId;
    record.userId = domain.userId;
    record.title = domain.title;
    record.currentVersionNumber = domain.currentVersionNumber;
    record.versions = domain.versions.map((v) =>
      this.versionMapper.toRecord(v),
    );
    if (
      domain instanceof DocumentArtifact &&
      record instanceof DocumentArtifactRecord
    ) {
      record.letterheadId = domain.letterheadId;
    }
    return record;
  }

  private toDomainBase(record: ArtifactRecord) {
    return {
      id: record.id,
      threadId: record.threadId,
      userId: record.userId,
      title: record.title,
      currentVersionNumber: record.currentVersionNumber,
      versions: record.versions?.map((v) => this.versionMapper.toDomain(v)),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private createRecord(domain: Artifact): ArtifactRecord {
    if (domain instanceof DocumentArtifact) {
      return new DocumentArtifactRecord();
    }
    if (domain instanceof DiagramArtifact) {
      return new DiagramArtifactRecord();
    }
    if (domain instanceof SpreadsheetArtifact) {
      return new SpreadsheetArtifactRecord();
    }
    if (domain instanceof EmailArtifact) {
      return new EmailArtifactRecord();
    }
    throw new Error('Invalid artifact domain type');
  }
}
