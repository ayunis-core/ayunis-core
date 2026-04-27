import {
  IsArray,
  IsBoolean,
  IsEmpty,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type ChatCompletionRole = 'system' | 'user' | 'assistant' | 'tool';

export class ChatCompletionFunctionDefinitionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'get_weather' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, example: 'Get the weather in a city' })
  description?: string;

  @IsOptional()
  @IsObject()
  @ApiProperty({
    required: false,
    description: 'JSON Schema describing the function arguments',
    example: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  })
  parameters?: Record<string, unknown>;
}

export class ChatCompletionToolDto {
  @IsIn(['function'])
  @ApiProperty({ enum: ['function'] })
  type: 'function';

  @ValidateNested()
  @Type(() => ChatCompletionFunctionDefinitionDto)
  @ApiProperty({ type: () => ChatCompletionFunctionDefinitionDto })
  function: ChatCompletionFunctionDefinitionDto;
}

export class ChatCompletionMessageToolCallFunctionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty({
    description: 'JSON-encoded arguments string supplied to the tool',
  })
  arguments: string;
}

export class ChatCompletionMessageToolCallDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  id: string;

  @IsIn(['function'])
  @ApiProperty({ enum: ['function'] })
  type: 'function';

  @ValidateNested()
  @Type(() => ChatCompletionMessageToolCallFunctionDto)
  @ApiProperty({ type: () => ChatCompletionMessageToolCallFunctionDto })
  function: ChatCompletionMessageToolCallFunctionDto;
}

export class ChatCompletionMessageDto {
  @IsIn(['system', 'user', 'assistant', 'tool'])
  @ApiProperty({ enum: ['system', 'user', 'assistant', 'tool'] })
  role: ChatCompletionRole;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'String content. Multipart/image content is not supported.',
  })
  content?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionMessageToolCallDto)
  @ApiProperty({
    required: false,
    type: () => ChatCompletionMessageToolCallDto,
    isArray: true,
  })
  tool_calls?: ChatCompletionMessageToolCallDto[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Required when role is "tool". Echoes the tool call id.',
  })
  tool_call_id?: string;
}

export class ChatCompletionRequestDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description:
      'A permitted language model name (e.g. "gpt-4o") or its UUID. ' +
      'When multiple permitted models share a name, the request must use the UUID.',
    example: 'gpt-4o',
  })
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionMessageDto)
  @ApiProperty({ type: () => ChatCompletionMessageDto, isArray: true })
  messages: ChatCompletionMessageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionToolDto)
  @ApiProperty({
    required: false,
    type: () => ChatCompletionToolDto,
    isArray: true,
  })
  tools?: ChatCompletionToolDto[];

  @IsOptional()
  @IsIn(['auto', 'required'], {
    message:
      '`tool_choice` must be "auto" or "required". Function-pinned tool_choice is not supported.',
  })
  @ApiProperty({
    required: false,
    enum: ['auto', 'required'],
  })
  tool_choice?: 'auto' | 'required';

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, default: false })
  stream?: boolean;

  // Unsupported sampling parameters — reject with 400 if provided so callers
  // are not misled into thinking their settings took effect.
  @IsEmpty({ message: '`temperature` is not supported by this endpoint' })
  temperature?: never;

  @IsEmpty({ message: '`max_tokens` is not supported by this endpoint' })
  max_tokens?: never;

  @IsEmpty({ message: '`top_p` is not supported by this endpoint' })
  top_p?: never;

  @IsEmpty({ message: '`frequency_penalty` is not supported by this endpoint' })
  frequency_penalty?: never;

  @IsEmpty({ message: '`presence_penalty` is not supported by this endpoint' })
  presence_penalty?: never;

  @IsEmpty({ message: '`seed` is not supported by this endpoint' })
  seed?: never;

  @IsEmpty({ message: '`n` is not supported by this endpoint' })
  n?: never;

  @IsEmpty({ message: '`stop` is not supported by this endpoint' })
  stop?: never;

  @IsEmpty({ message: '`logit_bias` is not supported by this endpoint' })
  logit_bias?: never;

  @IsEmpty({ message: '`logprobs` is not supported by this endpoint' })
  logprobs?: never;

  @IsEmpty({
    message: '`response_format` is not supported by this endpoint',
  })
  response_format?: never;

  @IsEmpty({
    message: '`parallel_tool_calls` is not supported by this endpoint',
  })
  parallel_tool_calls?: never;

  @IsEmpty({ message: '`user` is not supported by this endpoint' })
  user?: never;
}
