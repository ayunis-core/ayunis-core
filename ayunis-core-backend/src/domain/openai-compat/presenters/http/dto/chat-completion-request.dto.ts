import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  OpenAIChatCompletionMessage,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionToolChoice,
} from '../../../application/types/openai-request.types';

export class ChatCompletionFunctionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}

export class ChatCompletionToolDto {
  @IsIn(['function'])
  type!: 'function';

  @ValidateNested()
  @Type(() => ChatCompletionFunctionDto)
  function!: ChatCompletionFunctionDto;
}

export class ChatCompletionFunctionCallDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  arguments!: string;
}

export class ChatCompletionToolCallDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsIn(['function'])
  type!: 'function';

  @ValidateNested()
  @Type(() => ChatCompletionFunctionCallDto)
  function!: ChatCompletionFunctionCallDto;
}

export class ChatCompletionMessageDto implements OpenAIChatCompletionMessage {
  @IsIn(['system', 'user', 'assistant', 'tool'])
  role!: 'system' | 'user' | 'assistant' | 'tool';

  // Either a string (OpenAI's common shorthand) or null on assistant
  // messages that produced only tool_calls. Array-of-parts (multimodal) is
  // not supported in iter 3 — reject in the mapper for clarity.
  @IsOptional()
  content?: string | null;

  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionToolCallDto)
  tool_calls?: ChatCompletionToolCallDto[];

  @IsOptional()
  @IsString()
  name?: string;
}

export class ChatCompletionRequestDto implements OpenAIChatCompletionRequest {
  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionMessageDto)
  messages!: ChatCompletionMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionToolDto)
  tools?: ChatCompletionToolDto[];

  // OpenAI supports 'auto' | 'required' | 'none' | {type:'function', function:{name}}.
  // Iter 3 accepts the string forms; named-function tool_choice is treated as 'required'.
  @IsOptional()
  tool_choice?: OpenAIChatCompletionToolChoice;
}
