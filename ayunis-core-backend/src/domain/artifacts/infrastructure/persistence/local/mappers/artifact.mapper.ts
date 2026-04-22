import { Injectable } from '@nestjs/common';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  JsxArtifact,
} from '../../../../domain/artifact.entity';
import { ArtifactRecord } from '../schema/artifact.record';
import { DocumentArtifactRecord } from '../schema/document-artifact.record';
import { DiagramArtifactRecord } from '../schema/diagram-artifact.record';
import { JsxArtifactRecord } from '../schema/jsx-artifact.record';
import { ArtifactVersionMapper } from './artifact-version.mapper';

@Injectable()
export class ArtifactMapper {
  constructor(private readonly versionMapper: ArtifactVersionMapper) {}

  toDomain(record: DocumentArtifactRecord): DocumentArtifact;
  toDomain(record: DiagramArtifactRecord): DiagramArtifact;
  toDomain(record: JsxArtifactRecord): JsxArtifact;
  toDomain(record: ArtifactRecord): Artifact;
  toDomain(record: ArtifactRecord): Artifact {
    if (record instanceof DocumentArtifactRecord) {
      return new DocumentArtifact({
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
    if (record instanceof DiagramArtifactRecord) {
      return new DiagramArtifact({
        id: record.id,
        threadId: record.threadId,
        userId: record.userId,
        title: record.title,
        currentVersionNumber: record.currentVersionNumber,
        versions: record.versions?.map((v) => this.versionMapper.toDomain(v)),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    if (record instanceof JsxArtifactRecord) {
      return new JsxArtifact({
        id: record.id,
        threadId: record.threadId,
        userId: record.userId,
        title: record.title,
        currentVersionNumber: record.currentVersionNumber,
        versions: record.versions?.map((v) => this.versionMapper.toDomain(v)),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    throw new Error('Invalid artifact record type');
  }

  toRecord(domain: DocumentArtifact): DocumentArtifactRecord;
  toRecord(domain: DiagramArtifact): DiagramArtifactRecord;
  toRecord(domain: JsxArtifact): JsxArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord;
  toRecord(domain: Artifact): ArtifactRecord {
    if (domain instanceof DocumentArtifact) {
      const record = new DocumentArtifactRecord();
      record.id = domain.id;
      record.threadId = domain.threadId;
      record.userId = domain.userId;
      record.title = domain.title;
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
      record.threadId = domain.threadId;
      record.userId = domain.userId;
      record.title = domain.title;
      record.currentVersionNumber = domain.currentVersionNumber;
      record.versions = domain.versions.map((v) =>
        this.versionMapper.toRecord(v),
      );
      return record;
    }
    if (domain instanceof JsxArtifact) {
      const record = new JsxArtifactRecord();
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
    throw new Error('Invalid artifact domain type');
  }
}
