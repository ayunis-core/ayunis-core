import { Injectable } from '@nestjs/common';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class GetPermittedModelsUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(query: GetPermittedModelsQuery): Promise<PermittedModel[]> {
    return this.permittedModelsRepository.findAll(query.orgId);
  }
}
