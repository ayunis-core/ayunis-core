import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableModelsQuery } from './get-available-models.query';
import { ModelRegistry } from '../../registry/model.registry';
import { Model } from 'src/domain/models/domain/model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class GetAvailableModelsUseCase {
  private readonly logger = new Logger(GetAvailableModelsUseCase.name);

  constructor(
    private readonly modelRegistry: ModelRegistry,
    private readonly contextService: ContextService,
  ) {}

  execute(query: GetAvailableModelsQuery): Model[] {
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    if (orgRole !== UserRole.ADMIN && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('getAvailableModels', query);
    const allModels = this.modelRegistry.getAllAvailableModels();
    this.logger.debug('All available models', {
      allModels,
    });
    return allModels;
  }
}
