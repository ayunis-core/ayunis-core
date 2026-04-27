import { ApiProperty } from '@nestjs/swagger';
import { ChatCompletionUsageResponseDto } from './chat-completion-response.dto';

export class ChatCompletionChunkToolCallFunctionDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Incremental JSON-encoded arguments string',
  })
  arguments?: string;
}

export class ChatCompletionChunkToolCallDto {
  @ApiProperty()
  index: number;

  @ApiProperty({ required: false })
  id?: string;

  @ApiProperty({ required: false, enum: ['function'] })
  type?: 'function';

  @ApiProperty({
    required: false,
    type: () => ChatCompletionChunkToolCallFunctionDto,
  })
  function?: ChatCompletionChunkToolCallFunctionDto;
}

export class ChatCompletionChunkDeltaDto {
  @ApiProperty({ required: false, enum: ['assistant'] })
  role?: 'assistant';

  @ApiProperty({ required: false, nullable: true })
  content?: string | null;

  @ApiProperty({
    required: false,
    type: () => ChatCompletionChunkToolCallDto,
    isArray: true,
  })
  tool_calls?: ChatCompletionChunkToolCallDto[];
}

export class ChatCompletionChunkChoiceDto {
  @ApiProperty()
  index: number;

  @ApiProperty({ type: () => ChatCompletionChunkDeltaDto })
  delta: ChatCompletionChunkDeltaDto;

  @ApiProperty({ nullable: true, enum: ['stop', 'length', 'tool_calls'] })
  finish_reason: 'stop' | 'length' | 'tool_calls' | null;
}

export class ChatCompletionChunkDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['chat.completion.chunk'] })
  object: 'chat.completion.chunk';

  @ApiProperty()
  created: number;

  @ApiProperty()
  model: string;

  @ApiProperty({ type: () => ChatCompletionChunkChoiceDto, isArray: true })
  choices: ChatCompletionChunkChoiceDto[];

  @ApiProperty({
    required: false,
    nullable: true,
    type: () => ChatCompletionUsageResponseDto,
    description: 'Populated only on the final chunk',
  })
  usage?: ChatCompletionUsageResponseDto | null;
}
