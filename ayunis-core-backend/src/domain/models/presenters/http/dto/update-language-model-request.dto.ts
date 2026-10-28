import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseLanguageModelRequestDto } from './base-language-model-request.dto';

export class UpdateLanguageModelRequestDto extends BaseLanguageModelRequestDto {
  @ApiPropertyOptional({
    description:
      'Whether the upstream provider currently has a known fault for this model. Omission preserves the existing value.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasProviderFault?: boolean;
}
