import { ModelMapper } from '../../local-models/mappers/model.mapper';
import { LanguageModelRecord } from '../../local-models/schema/model.record';
import { PermittedModelScope } from '../../../../domain/value-objects/permitted-model-scope.enum';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { PermittedModelRecord } from '../schema/permitted-model.record';
import { PermittedModelMapper } from './permitted-model.mapper';

function buildRecord(): PermittedModelRecord {
  const model = new LanguageModelRecord();
  model.id = '123e4567-e89b-12d3-a456-426614174001';
  model.name = 'gpt-5.4';
  model.provider = ModelProvider.AZURE;
  model.displayName = 'GPT 5.4';
  model.canStream = true;
  model.canUseTools = true;
  model.isReasoning = false;
  model.canVision = true;
  model.isArchived = false;

  const record = new PermittedModelRecord();
  record.id = '123e4567-e89b-12d3-a456-426614174002';
  record.modelId = model.id;
  record.model = model;
  record.orgId = '123e4567-e89b-12d3-a456-426614174000';
  record.isDefault = false;
  record.anonymousOnly = true;
  record.internetAccessEnabled = false;
  record.scope = PermittedModelScope.ORG;
  record.scopeId = null;
  record.createdAt = new Date('2026-01-01T00:00:00.000Z');
  record.updatedAt = new Date('2026-01-02T00:00:00.000Z');
  return record;
}

describe('PermittedModelMapper', () => {
  it('preserves internet access policy in a persistence round trip', () => {
    const mapper = new PermittedModelMapper(new ModelMapper());

    const domain = mapper.toDomain(buildRecord());
    const record = mapper.toRecord(domain);

    expect(domain.internetAccessEnabled).toBe(false);
    expect(record.internetAccessEnabled).toBe(false);
  });
});
