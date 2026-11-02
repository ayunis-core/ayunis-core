import { Injectable } from '@nestjs/common';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelMapper } from 'src/domain/models/infrastructure/persistence/local-models/mappers/model.mapper';
import { ModelModeEntryRecord } from 'src/domain/models/infrastructure/persistence/local-model-mode-entries/schema/model-mode-entry.record';

@Injectable()
export class ModelModeEntryMapper {
  constructor(private readonly modelMapper: ModelMapper) {}

  toDomain(record: ModelModeEntryRecord): ModelModeEntry {
    return new ModelModeEntry({
      id: record.id,
      mode: record.mode,
      model: this.modelMapper.toDomain(record.model) as LanguageModel,
      position: record.position,
      enabled: record.enabled,
    });
  }

  toRecord(domain: ModelModeEntry): ModelModeEntryRecord {
    const record = new ModelModeEntryRecord();
    record.id = domain.id;
    record.mode = domain.mode;
    record.modelId = domain.model.id;
    record.position = domain.position;
    record.enabled = domain.enabled;
    return record;
  }
}
