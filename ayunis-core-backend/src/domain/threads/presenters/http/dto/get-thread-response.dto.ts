import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  MessageResponseDto,
  UserMessageResponseDto,
  SystemMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultMessageContentResponseDto,
} from './message-response.dto';
import { ModelResponseDto } from './model-response-dto';

@ApiExtraModels(
  UserMessageResponseDto,
  SystemMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultMessageContentResponseDto,
  ModelResponseDto,
)
export class GetThreadResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the thread',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this thread',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Model',
    type: ModelResponseDto,
  })
  model: ModelResponseDto;

  @ApiPropertyOptional({
    description: 'Title of the thread',
    example: 'Discussion about AI models',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Instruction for the thread',
    example:
      'Please analyze the attached documents and provide insights on market trends.',
  })
  instruction?: string;

  @ApiProperty({
    description: 'Whether internet search is enabled for the thread',
    example: false,
    type: Boolean,
  })
  isInternetSearchEnabled: boolean;

  @ApiProperty({
    description: 'Array of messages in the thread (role-specific types)',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(UserMessageResponseDto) },
        { $ref: getSchemaPath(SystemMessageResponseDto) },
        { $ref: getSchemaPath(AssistantMessageResponseDto) },
        { $ref: getSchemaPath(ToolResultMessageResponseDto) },
      ],
    },
  })
  messages: MessageResponseDto[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:30:00.000Z',
  })
  updatedAt: string;
}
