import type { ObjectLiteral, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { randomUUID } from 'crypto';

import { LocalSkillTemplateRepository } from './local-skill-template.repository';
import type { SkillTemplateRecord } from './schema/skill-template.record';
import { AlwaysOnSkillTemplateRecord } from './schema/always-on-skill-template.record';
import { PreCreatedCopySkillTemplateRecord } from './schema/pre-created-copy-skill-template.record';
import { SkillTemplateMapper } from './mappers/skill-template.mapper';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  SkillTemplateNotFoundError,
} from '../../../application/skill-templates.errors';

function buildAlwaysOnTemplate(
  overrides?: Partial<{
    name: string;
    isActive: boolean;
  }>,
): AlwaysOnSkillTemplate {
  return new AlwaysOnSkillTemplate({
    id: randomUUID(),
    name: overrides?.name ?? 'Bürgerservice Vorlage',
    shortDescription: 'Vorlage für Bürgerservice-Skills',
    instructions: 'Beantworte Fragen zum Bürgerservice.',
    isActive: overrides?.isActive ?? true,
  });
}

function buildPreCreatedTemplate(
  overrides?: Partial<{
    name: string;
    isActive: boolean;
  }>,
): PreCreatedCopySkillTemplate {
  return new PreCreatedCopySkillTemplate({
    id: randomUUID(),
    name: overrides?.name ?? 'Willkommens-Vorlage',
    shortDescription: 'Begrüßt neue Nutzer',
    instructions: 'Begrüße den Nutzer freundlich.',
    isActive: overrides?.isActive ?? true,
    defaultActive: true,
    defaultPinned: false,
  });
}

function buildAlwaysOnRecord(
  template: AlwaysOnSkillTemplate,
): AlwaysOnSkillTemplateRecord {
  const record = new AlwaysOnSkillTemplateRecord();
  record.id = template.id;
  record.name = template.name;
  record.shortDescription = template.shortDescription;
  record.instructions = template.instructions;
  record.isActive = template.isActive;
  record.createdAt = template.createdAt;
  record.updatedAt = template.updatedAt;
  return record;
}

function buildPreCreatedRecord(
  template: PreCreatedCopySkillTemplate,
): PreCreatedCopySkillTemplateRecord {
  const record = new PreCreatedCopySkillTemplateRecord();
  record.id = template.id;
  record.name = template.name;
  record.shortDescription = template.shortDescription;
  record.instructions = template.instructions;
  record.isActive = template.isActive;
  record.defaultActive = template.defaultActive;
  record.defaultPinned = template.defaultPinned;
  record.createdAt = template.createdAt;
  record.updatedAt = template.updatedAt;
  return record;
}

function createPgUniqueViolation(): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error('unique'));
  (error as QueryFailedError & { code?: string }).code = '23505';
  return error;
}

function createMockRepo<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
  return {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('LocalSkillTemplateRepository', () => {
  let repo: LocalSkillTemplateRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<SkillTemplateRecord>>;
  let mockAlwaysOnRepo: jest.Mocked<Repository<AlwaysOnSkillTemplateRecord>>;
  let mockPreCreatedRepo: jest.Mocked<
    Repository<PreCreatedCopySkillTemplateRecord>
  >;
  let mapper: SkillTemplateMapper;

  beforeEach(() => {
    mapper = new SkillTemplateMapper();

    mockTypeOrmRepo = createMockRepo<SkillTemplateRecord>();
    mockAlwaysOnRepo = createMockRepo<AlwaysOnSkillTemplateRecord>();
    mockPreCreatedRepo = createMockRepo<PreCreatedCopySkillTemplateRecord>();

    repo = new LocalSkillTemplateRepository(
      mockTypeOrmRepo,
      mockAlwaysOnRepo,
      mockPreCreatedRepo,
      mapper,
    );
  });

  describe('create', () => {
    it('should save and return the created skill template', async () => {
      const template = buildPreCreatedTemplate();
      const record = buildPreCreatedRecord(template);
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repo.create(template);

      expect(result.id).toBe(template.id);
      expect(result.name).toBe(template.name);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw DuplicateSkillTemplateNameError on unique violation', async () => {
      const template = buildPreCreatedTemplate();
      mockTypeOrmRepo.save.mockRejectedValue(createPgUniqueViolation());

      await expect(repo.create(template)).rejects.toThrow(
        DuplicateSkillTemplateNameError,
      );
    });

    it('should rethrow non-unique-violation errors', async () => {
      const template = buildPreCreatedTemplate();
      const dbError = new Error('connection lost');
      mockTypeOrmRepo.save.mockRejectedValue(dbError);

      await expect(repo.create(template)).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('should throw SkillTemplateNotFoundError when template does not exist', async () => {
      const template = buildAlwaysOnTemplate();
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.update(template)).rejects.toThrow(
        SkillTemplateNotFoundError,
      );
      expect(mockTypeOrmRepo.save).not.toHaveBeenCalled();
    });

    it('should save and return the updated skill template', async () => {
      const template = buildAlwaysOnTemplate();
      const record = buildAlwaysOnRecord(template);
      mockTypeOrmRepo.findOne.mockResolvedValue(record);
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repo.update(template);

      expect(result.id).toBe(template.id);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw DuplicateSkillTemplateNameError when renaming to existing name', async () => {
      const template = buildAlwaysOnTemplate({ name: 'Duplicate Name' });
      const existingRecord = buildAlwaysOnRecord(template);
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
      const template = buildAlwaysOnTemplate();
      const record = buildAlwaysOnRecord(template);
      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repo.findOne(template.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(template.id);
    });
  });

  describe('findAll', () => {
    it('should return all templates ordered by createdAt descending', async () => {
      const older = buildAlwaysOnTemplate({ name: 'Ältere Vorlage' });
      const newer = buildPreCreatedTemplate({ name: 'Neuere Vorlage' });
      mockTypeOrmRepo.find.mockResolvedValue([
        buildPreCreatedRecord(newer),
        buildAlwaysOnRecord(older),
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
      const template = buildAlwaysOnTemplate({ name: 'Meldewesen Vorlage' });
      const record = buildAlwaysOnRecord(template);
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
    it('should query the always-on child repository for ALWAYS_ON mode', async () => {
      const activeAlwaysOn = buildAlwaysOnTemplate({
        name: 'Immer Aktiv',
        isActive: true,
      });
      mockAlwaysOnRepo.find.mockResolvedValue([
        buildAlwaysOnRecord(activeAlwaysOn),
      ]);

      const result = await repo.findActiveByMode(DistributionMode.ALWAYS_ON);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Immer Aktiv');
      expect(result[0].isActive).toBe(true);
      expect(result[0].distributionMode).toBe(DistributionMode.ALWAYS_ON);
      expect(mockAlwaysOnRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
    });

    it('should query the pre-created child repository for PRE_CREATED_COPY mode', async () => {
      const preCreated = buildPreCreatedTemplate({
        name: 'Vorkonfiguriert',
        isActive: true,
      });
      mockPreCreatedRepo.find.mockResolvedValue([
        buildPreCreatedRecord(preCreated),
      ]);

      const result = await repo.findActiveByMode(
        DistributionMode.PRE_CREATED_COPY,
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Vorkonfiguriert');
      expect(mockPreCreatedRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when no active templates match the mode', async () => {
      mockAlwaysOnRepo.find.mockResolvedValue([]);

      const result = await repo.findActiveByMode(DistributionMode.ALWAYS_ON);

      expect(result).toEqual([]);
    });
  });
});
