import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { LanguageModel } from './models/language.model';
import type { ModelMode } from './value-objects/model-mode.enum';

export class ModelModeEntry {
  public readonly id: UUID;
  public readonly mode: ModelMode;
  public readonly model: LanguageModel;
  public readonly position: number;
  public readonly enabled: boolean;

  constructor(params: {
    id?: UUID;
    mode: ModelMode;
    model: LanguageModel;
    position: number;
    enabled: boolean;
  }) {
    this.id = params.id ?? randomUUID();
    this.mode = params.mode;
    this.model = params.model;
    this.position = params.position;
    this.enabled = params.enabled;
  }
}
