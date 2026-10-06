import { Injectable } from '@nestjs/common';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { IsModelPermittedQuery } from './is-model-permitted.query';
import { ContextService } from 'src/common/context/services/context.service';
import { isSuperAdmin } from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class IsModelPermittedUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: IsModelPermittedQuery): Promise<boolean> {
    const permittedModel = await this.permittedModelsRepository.findOne({
      id: query.modelId,
    });
    const orgId = this.contextService.get('orgId');
    const isFromOrg = orgId === permittedModel?.orgId;
    if (!isFromOrg && !isSuperAdmin(this.contextService)) {
      throw new UnauthorizedAccessError();
    }
    return !!permittedModel;
  }
}
