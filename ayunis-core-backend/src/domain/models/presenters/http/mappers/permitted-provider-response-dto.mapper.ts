import { Injectable } from '@nestjs/common';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { PermittedProviderResponseDto } from '../dto/permitted-provider-response.dto';
import { PermittedProviderWithInfo } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.use-case';

@Injectable()
export class PermittedProviderResponseDtoMapper {
  toDto(
    permittedProvider: PermittedProviderWithInfo,
  ): PermittedProviderResponseDto {
    return {
      provider: permittedProvider.provider,
      displayName: permittedProvider.displayName,
      hostedIn: permittedProvider.hostedIn,
    };
  }

  toDtoArray(
    permittedProviders: PermittedProviderWithInfo[],
  ): PermittedProviderResponseDto[] {
    return permittedProviders.map((provider) => this.toDto(provider));
  }
}
