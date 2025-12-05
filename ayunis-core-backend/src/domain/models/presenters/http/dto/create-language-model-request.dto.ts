import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsBoolean } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class CreateLanguageModelRequestDto {
  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-4',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The provider of the model',
    enum: ModelProvider,
    example: ModelProvider.OPENAI,
  })
  @IsEnum(ModelProvider)
  provider: ModelProvider;

  @ApiProperty({
    description: 'The display name of the model',
    example: 'GPT-4',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    description: 'Whether the model supports streaming',
    example: true,
  })
  @IsBoolean()
  canStream: boolean;

  @ApiProperty({
    description: 'Whether the model supports tool use',
    example: true,
  })
  @IsBoolean()
  canUseTools: boolean;

  @ApiProperty({
    description: 'Whether the model has reasoning capabilities',
    example: false,
  })
  @IsBoolean()
  isReasoning: boolean;

  @ApiProperty({
    description: 'Whether the model supports vision (image processing)',
    example: false,
  })
  @IsBoolean()
  canVision: boolean;

  @ApiProperty({
    description: 'Whether the model is archived',
    example: false,
  })
  @IsBoolean()
  isArchived: boolean;
}
