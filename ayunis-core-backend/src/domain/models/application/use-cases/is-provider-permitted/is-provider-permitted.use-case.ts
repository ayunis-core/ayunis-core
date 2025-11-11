import { Injectable } from '@nestjs/common';
import { IsProviderPermittedQuery } from './is-provider-permitted.query';
import { PermittedProvidersRepository } from '../../ports/permitted-providers.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class IsProviderPermittedUseCase {
  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: IsProviderPermittedQuery): Promise<boolean> {
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isFromOrg = orgId === query.orgId;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
    const permittedProviders = await this.permittedProvidersRepository.findAll(
      query.orgId,
    );
    return permittedProviders.some(
      (permittedProvider) => permittedProvider.provider === query.provider,
    );
  }
}
