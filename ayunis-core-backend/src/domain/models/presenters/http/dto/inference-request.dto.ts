import { Message } from 'src/domain/messages/domain/message.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ModelToolChoice } from 'src/domain/models/application/enums/model-tool-choice.enum';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InferenceRequestDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the model to use for the inference',
    example: 'mistral-large-latest',
  })
  modelName: string;

  @IsEnum(ModelProvider)
  @IsNotEmpty()
  @ApiProperty({
    description: 'The provider of the model to use for the inference',
    example: ModelProvider.MISTRAL,
    enum: ModelProvider,
  })
  modelProvider: ModelProvider;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Message)
  @ApiProperty({
    description: 'The messages to use for the inference',
    example: [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.',
      },
      {
        role: 'user',
        content: 'Hello, what can you help me with today?',
      },
    ],
    type: [Message],
  })
  messages: Message[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Tool)
  @ApiProperty({
    description: 'The tools to use for the inference',
    example: [
      {
        name: 'weather_tool',
        displayName: 'Weather Tool',
        description: 'Get current weather information for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city or location to get weather for',
            },
          },
          required: ['location'],
        },
      },
    ],
    required: false,
  })
  tools?: Tool[];

  @IsOptional()
  @IsEnum(ModelToolChoice)
  @ApiProperty({
    description: 'The tool choice to use for the inference',
    example: ModelToolChoice.AUTO,
    enum: ModelToolChoice,
    required: false,
  })
  toolChoice?: ModelToolChoice;
}
