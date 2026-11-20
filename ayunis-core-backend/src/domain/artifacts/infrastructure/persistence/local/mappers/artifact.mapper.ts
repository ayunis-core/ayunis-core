import { Injectable } from '@nestjs/common';
import {
  Artifact,
  BpmnArtifact,
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact.record';
import { DocumentArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/document-artifact.record';
import { DiagramArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/diagram-artifact.record';
import { SpreadsheetArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/spreadsheet-artifact.record';
import { BpmnArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/bpmn-artifact.record';
import { ArtifactVersionMapper } from './artifact-version.mapper';

@Injectable()
export class ArtifactMapper {
  constructor(private readonly versionMapper: ArtifactVersionMapper) {}

  toDomain(record: DocumentArtifactRecord): DocumentArtifact;
  toDomain(record: DiagramArtifactRecord): DiagramArtifact;
  toDomain(record: SpreadsheetArtifactRecord): SpreadsheetArtifact;
  toDomain(record: BpmnArtifactRecord): BpmnArtifact;
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
    if (record instanceof BpmnArtifactRecord) {
      return new BpmnArtifact(base);
    }
    throw new Error('Invalid artifact record type');
  }

  toRecord(domain: DocumentArtifact): DocumentArtifactRecord;
  toRecord(domain: DiagramArtifact): DiagramArtifactRecord;
  toRecord(domain: SpreadsheetArtifact): SpreadsheetArtifactRecord;
  toRecord(domain: BpmnArtifact): BpmnArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord {
    if (domain instanceof DocumentArtifact) {
      const record = this.fillRecord(new DocumentArtifactRecord(), domain);
      record.letterheadId = domain.letterheadId;
      return record;
    }
    if (domain instanceof DiagramArtifact) {
      return this.fillRecord(new DiagramArtifactRecord(), domain);
    }
    if (domain instanceof SpreadsheetArtifact) {
      return this.fillRecord(new SpreadsheetArtifactRecord(), domain);
    }
    if (domain instanceof BpmnArtifact) {
      return this.fillRecord(new BpmnArtifactRecord(), domain);
    }
    throw new Error('Invalid artifact domain type');
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

  private fillRecord<T extends ArtifactRecord>(record: T, domain: Artifact): T {
    record.id = domain.id;
    record.threadId = domain.threadId;
    record.userId = domain.userId;
    record.title = domain.title;
    record.currentVersionNumber = domain.currentVersionNumber;
    record.versions = domain.versions.map((v) =>
      this.versionMapper.toRecord(v),
    );
    return record;
  }
}
