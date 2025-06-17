import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class UpdateThreadModelDto {
  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-4',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({
    description: 'The provider of the model',
    example: ModelProvider.OPENAI,
    enum: ModelProvider,
  })
  @IsEnum(ModelProvider)
  modelProvider: ModelProvider;
}
