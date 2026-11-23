import { Injectable } from '@nestjs/common';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact.record';
import { DocumentArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/document-artifact.record';
import { DiagramArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/diagram-artifact.record';
import { SpreadsheetArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/spreadsheet-artifact.record';
import { ArtifactVersionMapper } from './artifact-version.mapper';
import { ArtifactPiiMaskMapper } from './artifact-pii-mask.mapper';
import type { ArtifactOwner } from 'src/domain/artifacts/domain/artifact-owner';

@Injectable()
export class ArtifactMapper {
  constructor(private readonly versionMapper: ArtifactVersionMapper) {}

  toDomain(record: DocumentArtifactRecord): DocumentArtifact;
  toDomain(record: DiagramArtifactRecord): DiagramArtifact;
  toDomain(record: SpreadsheetArtifactRecord): SpreadsheetArtifact;
  toDomain(record: ArtifactRecord): Artifact;
  toDomain(record: ArtifactRecord): Artifact {
    const base = {
      id: record.id,
      owner: toOwner(record),
      creatorId: record.creatorId,
      title: record.title,
      isAnonymous: record.isAnonymous,
      currentVersionNumber: record.currentVersionNumber,
      versions: record.versions?.map((v) => this.versionMapper.toDomain(v)),
      piiMasks: record.piiMasks?.map((m) => ArtifactPiiMaskMapper.toDomain(m)),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
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
    throw new Error('Invalid artifact record type');
  }

  toRecord(domain: DocumentArtifact): DocumentArtifactRecord;
  toRecord(domain: DiagramArtifact): DiagramArtifactRecord;
  toRecord(domain: SpreadsheetArtifact): SpreadsheetArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord {
    if (domain instanceof DocumentArtifact) {
      const record = new DocumentArtifactRecord();
      record.id = domain.id;
      assignOwner(record, domain);
      record.title = domain.title;
      record.isAnonymous = domain.isAnonymous;
      record.letterheadId = domain.letterheadId;
      record.currentVersionNumber = domain.currentVersionNumber;
      record.versions = domain.versions.map((v) =>
        this.versionMapper.toRecord(v),
      );
      return record;
    }
    if (domain instanceof DiagramArtifact) {
      const record = new DiagramArtifactRecord();
      record.id = domain.id;
      assignOwner(record, domain);
      record.title = domain.title;
      record.isAnonymous = domain.isAnonymous;
      record.currentVersionNumber = domain.currentVersionNumber;
      record.versions = domain.versions.map((v) =>
        this.versionMapper.toRecord(v),
      );
      return record;
    }
    if (domain instanceof SpreadsheetArtifact) {
      const record = new SpreadsheetArtifactRecord();
      record.id = domain.id;
      assignOwner(record, domain);
      record.title = domain.title;
      record.isAnonymous = domain.isAnonymous;
      record.currentVersionNumber = domain.currentVersionNumber;
      record.versions = domain.versions.map((v) =>
        this.versionMapper.toRecord(v),
      );
      return record;
    }
    throw new Error('Invalid artifact domain type');
  }
}

function toOwner(record: ArtifactRecord): ArtifactOwner {
  if (record.workspaceId) {
    return { type: 'workspace', workspaceId: record.workspaceId };
  }
  if (record.userId) {
    return { type: 'personal', userId: record.userId };
  }
  throw new Error('Artifact record without owner');
}

function assignOwner(record: ArtifactRecord, domain: Artifact): void {
  record.userId = domain.owner.type === 'personal' ? domain.owner.userId : null;
  record.workspaceId =
    domain.owner.type === 'workspace' ? domain.owner.workspaceId : null;
  record.creatorId = domain.creatorId;
}
