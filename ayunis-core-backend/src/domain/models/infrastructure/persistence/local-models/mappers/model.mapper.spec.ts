import { Logger } from '@nestjs/common';
import { ModelMapper } from './model.mapper';
import { LanguageModelRecord } from '../schema/model.record';
import { LanguageModel } from '../../../../domain/models/language.model';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { ModelTier } from '../../../../domain/value-objects/model-tier.enum';
import type { UUID } from 'crypto';

describe('ModelMapper', () => {
  let mapper: ModelMapper;
  let warnSpy: jest.SpyInstance;

  const mockId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(() => {
    mapper = new ModelMapper();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildLanguageRecord = (
    tier: string | null | undefined,
  ): LanguageModelRecord => {
    const record = new LanguageModelRecord();
    record.id = mockId;
    record.name = 'gpt-4';
    record.provider = ModelProvider.OPENAI;
    record.displayName = 'GPT-4';
    record.canStream = true;
    record.canUseTools = true;
    record.isReasoning = false;
    record.canVision = false;
    record.isArchived = false;
    record.createdAt = new Date('2025-01-01T00:00:00Z');
    record.updatedAt = new Date('2025-01-02T00:00:00Z');
    record.tier = tier ?? null;
    return record;
  };

  const buildLanguageDomain = (tier?: ModelTier): LanguageModel => {
    return new LanguageModel({
      id: mockId,
      name: 'gpt-4',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
      tier,
    });
  };

  describe('toDomain (language model)', () => {
    it('reads a valid tier value from the record', () => {
      const record = buildLanguageRecord(ModelTier.HIGH);

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(LanguageModel);
      expect((domain as LanguageModel).tier).toBe(ModelTier.HIGH);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns and falls back to undefined for an unknown tier value', () => {
      const record = buildLanguageRecord('platinum');

      const domain = mapper.toDomain(record);

      expect((domain as LanguageModel).tier).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'Encountered unknown model tier value, ignoring',
        expect.objectContaining({
          value: 'platinum',
          modelId: mockId,
          modelName: 'gpt-4',
        }),
      );
    });

    it('returns undefined tier for a null record value without warning', () => {
      const record = buildLanguageRecord(null);

      const domain = mapper.toDomain(record);

      expect((domain as LanguageModel).tier).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('toRecord (language model)', () => {
    it('writes the tier onto the record', () => {
      const domain = buildLanguageDomain(ModelTier.LOW);

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(LanguageModelRecord);
      expect((record as LanguageModelRecord).tier).toBe(ModelTier.LOW);
    });

    it('writes null onto the record when the domain tier is undefined', () => {
      const domain = buildLanguageDomain();

      const record = mapper.toRecord(domain);

      expect((record as LanguageModelRecord).tier).toBeNull();
    });
  });

  describe('round-trip', () => {
    it('preserves a set tier through toRecord -> toDomain', () => {
      const original = buildLanguageDomain(ModelTier.MEDIUM);

      const record = mapper.toRecord(original) as LanguageModelRecord;
      const roundTripped = mapper.toDomain(record) as LanguageModel;

      expect(roundTripped.tier).toBe(ModelTier.MEDIUM);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('preserves an undefined tier through toRecord -> toDomain', () => {
      const original = buildLanguageDomain();

      const record = mapper.toRecord(original) as LanguageModelRecord;
      const roundTripped = mapper.toDomain(record) as LanguageModel;

      expect(roundTripped.tier).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
