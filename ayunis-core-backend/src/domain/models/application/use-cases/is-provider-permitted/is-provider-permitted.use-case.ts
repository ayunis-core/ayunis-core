import { Injectable } from '@nestjs/common';
import { IsProviderPermittedQuery } from './is-provider-permitted.query';
import { PermittedProvidersRepository } from '../../ports/permitted-providers.repository';

@Injectable()
export class IsProviderPermittedUseCase {
  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
  ) {}

  async execute(query: IsProviderPermittedQuery): Promise<boolean> {
    const permittedProviders = await this.permittedProvidersRepository.findAll(
      query.orgId,
    );
    return permittedProviders.some(
      (permittedProvider) => permittedProvider.provider === query.provider,
    );
  }
}
