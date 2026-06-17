import { randomUUID } from 'crypto';
import { ArtifactVersionMapper } from './artifact-version.mapper';
import { ArtifactVersion } from '../../../../domain/artifact-version.entity';
import { ArtifactVersionRecord } from '../schema/artifact-version.record';
import { AuthorType } from '../../../../domain/value-objects/author-type.enum';

describe('ArtifactVersionMapper', () => {
  let mapper: ArtifactVersionMapper;

  beforeEach(() => {
    mapper = new ArtifactVersionMapper();
  });

  const now = new Date('2026-02-18T10:00:00.000Z');
  const versionId = randomUUID();
  const artifactId = randomUUID();
  const userId = randomUUID();

  describe('toDomain', () => {
    it('should map a record with user author to a domain entity', () => {
      const record = new ArtifactVersionRecord();
      record.id = versionId;
      record.artifactId = artifactId;
      record.versionNumber = 2;
      record.content = '<p>Updated municipal budget report</p>';
      record.authorType = AuthorType.USER;
      record.authorId = userId;
      record.createdAt = now;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(ArtifactVersion);
      expect(domain.id).toBe(versionId);
      expect(domain.artifactId).toBe(artifactId);
      expect(domain.versionNumber).toBe(2);
      expect(domain.content).toBe('<p>Updated municipal budget report</p>');
      expect(domain.authorType).toBe(AuthorType.USER);
      expect(domain.authorId).toBe(userId);
      expect(domain.createdAt).toBe(now);
    });

    it('should map a record with assistant author and null authorId', () => {
      const record = new ArtifactVersionRecord();
      record.id = versionId;
      record.artifactId = artifactId;
      record.versionNumber = 1;
      record.content = '<h1>Draft</h1>';
      record.authorType = AuthorType.ASSISTANT;
      record.authorId = null;
      record.createdAt = now;

      const domain = mapper.toDomain(record);

      expect(domain.authorType).toBe(AuthorType.ASSISTANT);
      expect(domain.authorId).toBeNull();
    });
  });

  describe('toRecord', () => {
    it('should map a domain entity to a record', () => {
      const domain = new ArtifactVersion({
        id: versionId,
        artifactId,
        versionNumber: 3,
        content: '<p>Final version of the proposal</p>',
        authorType: AuthorType.USER,
        authorId: userId,
        createdAt: now,
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(ArtifactVersionRecord);
      expect(record.id).toBe(versionId);
      expect(record.artifactId).toBe(artifactId);
      expect(record.versionNumber).toBe(3);
      expect(record.content).toBe('<p>Final version of the proposal</p>');
      expect(record.authorType).toBe(AuthorType.USER);
      expect(record.authorId).toBe(userId);
    });
  });

  describe('round-trip', () => {
    it('should preserve all fields through domain → record → domain', () => {
      const original = new ArtifactVersion({
        id: versionId,
        artifactId,
        versionNumber: 5,
        content: '<h2>Section 1</h2><p>Detailed analysis of water usage</p>',
        authorType: AuthorType.USER,
        authorId: userId,
        createdAt: now,
      });

      const record = mapper.toRecord(original);
      // Simulate DB setting createdAt
      record.createdAt = now;
      const reconstructed = mapper.toDomain(record);

      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.artifactId).toBe(original.artifactId);
      expect(reconstructed.versionNumber).toBe(original.versionNumber);
      expect(reconstructed.content).toBe(original.content);
      expect(reconstructed.authorType).toBe(original.authorType);
      expect(reconstructed.authorId).toBe(original.authorId);
      expect(reconstructed.createdAt).toEqual(original.createdAt);
    });

    it('should preserve null authorId through round-trip', () => {
      const original = new ArtifactVersion({
        id: versionId,
        artifactId,
        versionNumber: 1,
        content: '<p>AI generated content</p>',
        authorType: AuthorType.ASSISTANT,
        authorId: null,
        createdAt: now,
      });

      const record = mapper.toRecord(original);
      record.createdAt = now;
      const reconstructed = mapper.toDomain(record);

      expect(reconstructed.authorId).toBeNull();
      expect(reconstructed.authorType).toBe(AuthorType.ASSISTANT);
    });
  });
});
