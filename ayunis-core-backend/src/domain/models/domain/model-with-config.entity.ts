import { Model } from './model.entity';
import { ModelConfig } from './model-config.entity';

export class ModelWithConfig {
  public readonly model: Model;
  public readonly config: ModelConfig;

  constructor(model: Model, config: ModelConfig) {
    this.model = model;
    this.config = config;
  }
}
