import { Injectable } from '@nestjs/common';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptResponseDto } from '../dto/prompt-response.dto';

@Injectable()
export class PromptDtoMapper {
  toDto(prompt: Prompt): PromptResponseDto {
    return {
      id: prompt.id,
      title: prompt.title,
      content: prompt.content,
      userId: prompt.userId,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  }

  toDtoArray(prompts: Prompt[]): PromptResponseDto[] {
    return prompts.map((prompt) => this.toDto(prompt));
  }
}
