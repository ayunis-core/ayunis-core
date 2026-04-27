import { ApiProperty } from '@nestjs/swagger';

export class ChatCompletionToolCallFunctionResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty({
    description: 'JSON-encoded arguments string the assistant proposed',
  })
  arguments: string;
}

export class ChatCompletionToolCallResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['function'] })
  type: 'function';

  @ApiProperty({ type: () => ChatCompletionToolCallFunctionResponseDto })
  function: ChatCompletionToolCallFunctionResponseDto;
}

export class ChatCompletionMessageResponseDto {
  @ApiProperty({ enum: ['assistant'] })
  role: 'assistant';

  @ApiProperty({ nullable: true })
  content: string | null;

  @ApiProperty({
    required: false,
    type: () => ChatCompletionToolCallResponseDto,
    isArray: true,
  })
  tool_calls?: ChatCompletionToolCallResponseDto[];
}

export class ChatCompletionChoiceResponseDto {
  @ApiProperty()
  index: number;

  @ApiProperty({ type: () => ChatCompletionMessageResponseDto })
  message: ChatCompletionMessageResponseDto;

  @ApiProperty({ nullable: true, enum: ['stop', 'length', 'tool_calls'] })
  finish_reason: 'stop' | 'length' | 'tool_calls' | null;
}

export class ChatCompletionUsageResponseDto {
  @ApiProperty()
  prompt_tokens: number;

  @ApiProperty()
  completion_tokens: number;

  @ApiProperty()
  total_tokens: number;
}

export class ChatCompletionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['chat.completion'] })
  object: 'chat.completion';

  @ApiProperty({ description: 'Unix timestamp (seconds)' })
  created: number;

  @ApiProperty()
  model: string;

  @ApiProperty({
    type: () => ChatCompletionChoiceResponseDto,
    isArray: true,
  })
  choices: ChatCompletionChoiceResponseDto[];

  @ApiProperty({ type: () => ChatCompletionUsageResponseDto })
  usage: ChatCompletionUsageResponseDto;
}
