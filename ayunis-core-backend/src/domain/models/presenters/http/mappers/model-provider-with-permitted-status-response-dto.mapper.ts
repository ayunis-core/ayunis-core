import { Injectable } from '@nestjs/common';
import { ModelProviderInfoWithPermittedStatus } from 'src/domain/models/application/use-cases/get-all-model-provider-infos-with-permitted-status/get-all-model-provider-infos-with-permitted-status.use-case';
import { ModelProviderWithPermittedStatusResponseDto } from '../dto/model-provider-with-permitted-status-response.dto';

@Injectable()
export class ModelProviderWithPermittedStatusResponseDtoMapper {
  toDto(
    providerInfo: ModelProviderInfoWithPermittedStatus,
  ): ModelProviderWithPermittedStatusResponseDto {
    return {
      provider: providerInfo.provider,
      displayName: providerInfo.displayName,
      hostedIn: providerInfo.hostedIn as any, // Convert string to enum
      isPermitted: providerInfo.isPermitted,
    };
  }

  toDtoArray(
    providerInfos: ModelProviderInfoWithPermittedStatus[],
  ): ModelProviderWithPermittedStatusResponseDto[] {
    return providerInfos.map((info) => this.toDto(info));
  }
}
