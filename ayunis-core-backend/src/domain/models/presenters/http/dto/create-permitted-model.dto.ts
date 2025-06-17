import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class CreatePermittedModelDto {
  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-4',
  })
  @IsString()
  modelName: string;

  @ApiProperty({
    description: 'The provider of the model',
    example: 'openai',
  })
  @IsEnum(ModelProvider)
  modelProvider: ModelProvider;
}
