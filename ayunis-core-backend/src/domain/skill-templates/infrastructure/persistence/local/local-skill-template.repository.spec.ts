import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { randomUUID } from 'crypto';

import { LocalSkillTemplateRepository } from './local-skill-template.repository';
import { SkillTemplateRecord } from './schema/skill-template.record';
import { SkillTemplateMapper } from './mappers/skill-template.mapper';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  SkillTemplateNotFoundError,
} from '../../../application/skill-templates.errors';

function buildSkillTemplate(overrides?: Partial<SkillTemplate>): SkillTemplate {
  return new SkillTemplate({
    id: randomUUID(),
    name: 'Bürgerservice Vorlage',
    shortDescription: 'Vorlage für Bürgerservice-Skills',
    instructions: 'Beantworte Fragen zum Bürgerservice.',
    distributionMode: DistributionMode.PRE_CREATED_COPY,
    isActive: true,
    ...overrides,
  });
}

function buildRecord(template: SkillTemplate): SkillTemplateRecord {
  const record = new SkillTemplateRecord();
  record.id = template.id;
  record.name = template.name;
  record.shortDescription = template.shortDescription;
  record.instructions = template.instructions;
  record.distributionMode = template.distributionMode;
  record.isActive = template.isActive;
  record.createdAt = template.createdAt;
  record.updatedAt = template.updatedAt;
  return record;
}

function createPgUniqueViolation(): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error('unique'));
  (error as QueryFailedError & { code?: string }).code = '23505';
  return error;
}

describe('LocalSkillTemplateRepository', () => {
  let repo: LocalSkillTemplateRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<SkillTemplateRecord>>;
  let mapper: SkillTemplateMapper;

  beforeEach(() => {
    mapper = new SkillTemplateMapper();

    mockTypeOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<SkillTemplateRecord>>;

    repo = new LocalSkillTemplateRepository(mockTypeOrmRepo, mapper);
  });

  describe('create', () => {
    it('should save and return the created skill template', async () => {
      const template = buildSkillTemplate();
      const record = buildRecord(template);
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repo.create(template);

      expect(result.id).toBe(template.id);
      expect(result.name).toBe(template.name);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw DuplicateSkillTemplateNameError on unique violation', async () => {
      const template = buildSkillTemplate();
      mockTypeOrmRepo.save.mockRejectedValue(createPgUniqueViolation());

      await expect(repo.create(template)).rejects.toThrow(
        DuplicateSkillTemplateNameError,
      );
    });

    it('should rethrow non-unique-violation errors', async () => {
      const template = buildSkillTemplate();
      const dbError = new Error('connection lost');
      mockTypeOrmRepo.save.mockRejectedValue(dbError);

      await expect(repo.create(template)).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('should throw SkillTemplateNotFoundError when template does not exist', async () => {
      const template = buildSkillTemplate();
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.update(template)).rejects.toThrow(
        SkillTemplateNotFoundError,
      );
      expect(mockTypeOrmRepo.save).not.toHaveBeenCalled();
    });

    it('should save and return the updated skill template', async () => {
      const template = buildSkillTemplate();
      const record = buildRecord(template);
      mockTypeOrmRepo.findOne.mockResolvedValue(record);
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repo.update(template);

      expect(result.id).toBe(template.id);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw DuplicateSkillTemplateNameError when renaming to existing name', async () => {
      const template = buildSkillTemplate({ name: 'Duplicate Name' });
      const existingRecord = buildRecord(template);
      mockTypeOrmRepo.findOne.mockResolvedValue(existingRecord);
      mockTypeOrmRepo.save.mockRejectedValue(createPgUniqueViolation());

      await expect(repo.update(template)).rejects.toThrow(
        DuplicateSkillTemplateNameError,
      );
    });
  });

  describe('delete', () => {
    it('should throw SkillTemplateNotFoundError when template does not exist', async () => {
      const id = randomUUID();
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repo.delete(id)).rejects.toThrow(SkillTemplateNotFoundError);
    });

    it('should delete without error when template exists', async () => {
      const id = randomUUID();
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(repo.delete(id)).resolves.toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should return null when template does not exist', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOne(randomUUID());

      expect(result).toBeNull();
    });

    it('should return the domain entity when found', async () => {
      const template = buildSkillTemplate();
      const record = buildRecord(template);
      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repo.findOne(template.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(template.id);
    });
  });

  describe('findAll', () => {
    it('should return all templates ordered by createdAt descending', async () => {
      const older = buildSkillTemplate({ name: 'Ältere Vorlage' });
      const newer = buildSkillTemplate({ name: 'Neuere Vorlage' });
      mockTypeOrmRepo.find.mockResolvedValue([
        buildRecord(newer),
        buildRecord(older),
      ]);

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Neuere Vorlage');
      expect(result[1].name).toBe('Ältere Vorlage');
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should return the template when found by name', async () => {
      const template = buildSkillTemplate({ name: 'Meldewesen Vorlage' });
      const record = buildRecord(template);
      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repo.findByName('Meldewesen Vorlage');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Meldewesen Vorlage');
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Meldewesen Vorlage' },
      });
    });

    it('should return null when no template matches the name', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repo.findByName('Nicht Vorhanden');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByMode', () => {
    it('should return only active templates with the specified distribution mode', async () => {
      const activeAlwaysOn = buildSkillTemplate({
        name: 'Immer Aktiv',
        distributionMode: DistributionMode.ALWAYS_ON,
        isActive: true,
      });
      mockTypeOrmRepo.find.mockResolvedValue([buildRecord(activeAlwaysOn)]);

      const result = await repo.findActiveByMode(DistributionMode.ALWAYS_ON);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Immer Aktiv');
      expect(result[0].isActive).toBe(true);
      expect(result[0].distributionMode).toBe(DistributionMode.ALWAYS_ON);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, distributionMode: DistributionMode.ALWAYS_ON },
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when no active templates match the mode', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      const result = await repo.findActiveByMode(
        DistributionMode.PRE_CREATED_COPY,
      );

      expect(result).toEqual([]);
    });

    it('should not return inactive templates', async () => {
      // The repository queries with isActive: true, so inactive records
      // are filtered at the database level. Mock returns empty to verify
      // the correct query is issued.
      mockTypeOrmRepo.find.mockResolvedValue([]);

      await repo.findActiveByMode(DistributionMode.ALWAYS_ON);

      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });
});
