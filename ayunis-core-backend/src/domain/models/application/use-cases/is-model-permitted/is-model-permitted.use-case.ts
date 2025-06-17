import { Injectable } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { IsModelPermittedQuery } from './is-model-permitted.query';

@Injectable()
export class IsModelPermittedUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(query: IsModelPermittedQuery): Promise<boolean> {
    const permittedModel = await this.permittedModelsRepository.findOne({
      id: query.modelId,
      orgId: query.orgId,
    });
    return !!permittedModel;
  }
}
