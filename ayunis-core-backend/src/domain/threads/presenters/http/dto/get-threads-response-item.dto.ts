import {
  ApiProperty,
  ApiPropertyOptional,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  UserMessageResponseDto,
  SystemMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultMessageContentResponseDto,
} from './get-thread-response.dto/message-response.dto';
import { ModelResponseDto } from './get-thread-response.dto/model-response-dto';

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
export class GetThreadsResponseDtoItem {
  @ApiProperty({
    description: 'Unique identifier for the thread',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Title of the thread',
    example: 'Discussion about AI models',
  })
  title?: string;

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
