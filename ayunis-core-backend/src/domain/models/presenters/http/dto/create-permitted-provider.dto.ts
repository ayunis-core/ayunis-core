import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class CreatePermittedProviderDto {
  @ApiProperty({
    description: 'The model provider to permit',
    enum: ModelProvider,
    example: ModelProvider.OPENAI,
  })
  @IsEnum(ModelProvider)
  provider: ModelProvider;
}
