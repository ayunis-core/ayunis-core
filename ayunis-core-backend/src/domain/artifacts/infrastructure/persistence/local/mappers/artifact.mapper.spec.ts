import { randomUUID } from 'crypto';
import { ArtifactMapper } from './artifact.mapper';
import { ArtifactVersionMapper } from './artifact-version.mapper';
import {
  DocumentArtifact,
  JsxArtifact,
} from '../../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../../domain/artifact-version.entity';
import { DocumentArtifactRecord } from '../schema/document-artifact.record';
import { JsxArtifactRecord } from '../schema/jsx-artifact.record';
import { ArtifactVersionRecord } from '../schema/artifact-version.record';
import { AuthorType } from '../../../../domain/value-objects/author-type.enum';

describe('ArtifactMapper', () => {
  let mapper: ArtifactMapper;
  let versionMapper: ArtifactVersionMapper;

  beforeEach(() => {
    versionMapper = new ArtifactVersionMapper();
    mapper = new ArtifactMapper(versionMapper);
  });

  const now = new Date('2026-02-18T10:00:00.000Z');
  const artifactId = randomUUID();
  const threadId = randomUUID();
  const userId = randomUUID();
  const letterheadId = randomUUID();

  describe('toDomain', () => {
    it('should map a record without versions to a domain entity', () => {
      const record = new DocumentArtifactRecord();
      record.id = artifactId;
      record.threadId = threadId;
      record.userId = userId;
      record.title = 'Budget Report Q1 2026';
      record.letterheadId = null;
      record.currentVersionNumber = 3;
      record.createdAt = now;
      record.updatedAt = now;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(DocumentArtifact);
      expect(domain.id).toBe(artifactId);
      expect(domain.threadId).toBe(threadId);
      expect(domain.userId).toBe(userId);
      expect(domain.title).toBe('Budget Report Q1 2026');
      expect(domain.letterheadId).toBeNull();
      expect(domain.currentVersionNumber).toBe(3);
      expect(domain.createdAt).toBe(now);
      expect(domain.updatedAt).toBe(now);
    });

    it('should map a record with letterheadId to a domain entity', () => {
      const record = new DocumentArtifactRecord();
      record.id = artifactId;
      record.threadId = threadId;
      record.userId = userId;
      record.title = 'Official Letter';
      record.letterheadId = letterheadId;
      record.currentVersionNumber = 1;
      record.createdAt = now;
      record.updatedAt = now;

      const domain = mapper.toDomain(record);

      expect(domain.letterheadId).toBe(letterheadId);
    });

    it('should map a record with versions to a domain entity', () => {
      const versionRecord = new ArtifactVersionRecord();
      versionRecord.id = randomUUID();
      versionRecord.artifactId = artifactId;
      versionRecord.versionNumber = 1;
      versionRecord.content = '<p>Initial content</p>';
      versionRecord.authorType = AuthorType.ASSISTANT;
      versionRecord.authorId = null;
      versionRecord.createdAt = now;

      const record = new DocumentArtifactRecord();
      record.id = artifactId;
      record.threadId = threadId;
      record.userId = userId;
      record.title = 'Budget Report Q1 2026';
      record.letterheadId = null;
      record.currentVersionNumber = 1;
      record.versions = [versionRecord];
      record.createdAt = now;
      record.updatedAt = now;

      const domain = mapper.toDomain(record);

      expect(domain.versions).toHaveLength(1);
      expect(domain.versions[0]).toBeInstanceOf(ArtifactVersion);
      expect(domain.versions[0].content).toBe('<p>Initial content</p>');
    });
  });

  describe('toRecord', () => {
    it('should map a domain entity to a record', () => {
      const domain = new DocumentArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Budget Report Q1 2026',
        currentVersionNumber: 2,
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(DocumentArtifactRecord);
      expect(record.id).toBe(artifactId);
      expect(record.threadId).toBe(threadId);
      expect(record.userId).toBe(userId);
      expect(record.title).toBe('Budget Report Q1 2026');
      expect(record.letterheadId).toBeNull();
      expect(record.currentVersionNumber).toBe(2);
    });

    it('should map a domain entity with letterheadId to a record', () => {
      const domain = new DocumentArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Official Letter',
        letterheadId,
        currentVersionNumber: 1,
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(domain);

      expect(record.letterheadId).toBe(letterheadId);
    });
  });

  describe('JsxArtifact round-trip', () => {
    it('should map JsxArtifactRecord to JsxArtifact and back', () => {
      const version = new ArtifactVersion({
        artifactId,
        versionNumber: 1,
        content: 'function App() { return <div>hi</div>; }',
        authorType: AuthorType.ASSISTANT,
        authorId: null,
        createdAt: now,
      });

      const original = new JsxArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Landing Page',
        currentVersionNumber: 1,
        versions: [version],
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(original);
      expect(record).toBeInstanceOf(JsxArtifactRecord);

      record.createdAt = now;
      record.updatedAt = now;
      if (record.versions?.[0]) {
        record.versions[0].createdAt = now;
      }
      const reconstructed = mapper.toDomain(record);

      expect(reconstructed).toBeInstanceOf(JsxArtifact);
      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.title).toBe(original.title);
      expect(reconstructed.versions[0].content).toBe(version.content);
    });
  });

  describe('round-trip', () => {
    it('should preserve all fields through domain → record → domain', () => {
      const version = new ArtifactVersion({
        artifactId,
        versionNumber: 1,
        content: '<h1>Project Plan</h1><p>Phase 1: Research</p>',
        authorType: AuthorType.USER,
        authorId: userId,
        createdAt: now,
      });

      const original = new DocumentArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Project Plan Document',
        letterheadId,
        currentVersionNumber: 1,
        versions: [version],
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(original);
      // Simulate DB setting createdAt/updatedAt on the record
      record.createdAt = now;
      record.updatedAt = now;
      if (record.versions?.[0]) {
        record.versions[0].createdAt = now;
      }
      const reconstructed = mapper.toDomain(record);

      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.threadId).toBe(original.threadId);
      expect(reconstructed.userId).toBe(original.userId);
      expect(reconstructed.title).toBe(original.title);
      expect(reconstructed.letterheadId).toBe(original.letterheadId);
      expect(reconstructed.currentVersionNumber).toBe(
        original.currentVersionNumber,
      );
      expect(reconstructed.versions).toHaveLength(1);
      expect(reconstructed.versions[0].content).toBe(version.content);
      expect(reconstructed.versions[0].authorType).toBe(version.authorType);
      expect(reconstructed.versions[0].authorId).toBe(version.authorId);
    });
  });
});
