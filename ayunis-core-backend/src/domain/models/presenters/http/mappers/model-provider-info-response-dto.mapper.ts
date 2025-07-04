import { Injectable } from '@nestjs/common';
import { ModelProviderInfoEntity } from 'src/domain/models/domain/model-provider-info.entity';
import { ModelProviderInfoResponseDto } from '../dto/model-provider-info-response.dto';

@Injectable()
export class ModelProviderInfoResponseDtoMapper {
  toDto(entity: ModelProviderInfoEntity): ModelProviderInfoResponseDto {
    return {
      provider: entity.provider,
      displayName: entity.displayName,
      hostedIn: entity.hostedIn,
    };
  }
}
