import { Injectable } from '@nestjs/common';
import type { ThreadAiContext } from 'src/domain/runs/application/models/thread-ai-context';
import type { ThreadAiContextResponseDto } from 'src/domain/runs/presenters/http/dto/thread-ai-context-response.dto';

@Injectable()
export class ThreadAiContextResponseMapper {
  toDto(context: ThreadAiContext): ThreadAiContextResponseDto {
    return {
      skills: context.skills.map((skill) => ({ ...skill })),
      knowledgeBases: context.knowledgeBases.map((knowledgeBase) => ({
        ...knowledgeBase,
      })),
    };
  }
}
