import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseLanguageModelRequestDto } from './base-language-model-request.dto';

export class CreateLanguageModelRequestDto extends BaseLanguageModelRequestDto {
  @ApiPropertyOptional({
    description:
      'Whether the upstream provider currently has a known fault for this model',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasProviderFault?: boolean;
}
