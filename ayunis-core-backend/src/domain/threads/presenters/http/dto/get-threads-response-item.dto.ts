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
import { ThreadMetadataResponseDto } from './thread-metadata-response.dto';

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
export class GetThreadsResponseDtoItem extends ThreadMetadataResponseDto {
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
}
