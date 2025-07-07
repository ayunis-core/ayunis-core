import { GetModelProviderInfoQuery } from './get-model-provider-info.query';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { ModelProviderInfoEntity } from 'src/domain/models/domain/model-provider-info.entity';
import { Injectable } from '@nestjs/common';
import {
  ModelProviderInfoNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';

@Injectable()
export class GetModelProviderInfoUseCase {
  constructor(
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
  ) {}

  execute(query: GetModelProviderInfoQuery): ModelProviderInfoEntity {
    try {
      return this.modelProviderInfoRegistry.getModelProviderInfo(
        query.provider,
      );
    } catch (error) {
      if (error instanceof ModelProviderInfoNotFoundError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
