import { Controller, Get, Logger, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { GetThreadAiContextQuery } from 'src/domain/runs/application/use-cases/get-thread-ai-context/get-thread-ai-context.query';
import { GetThreadAiContextUseCase } from 'src/domain/runs/application/use-cases/get-thread-ai-context/get-thread-ai-context.use-case';
import { ThreadAiContextResponseDto } from 'src/domain/runs/presenters/http/dto/thread-ai-context-response.dto';
import { ThreadAiContextResponseMapper } from 'src/domain/runs/presenters/http/mappers/thread-ai-context-response.mapper';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

@ApiTags('threads')
@RequireAcademyCertificate()
@Controller('threads')
export class ThreadAiContextController {
  private readonly logger = new Logger(ThreadAiContextController.name);

  constructor(
    private readonly getThreadAiContext: GetThreadAiContextUseCase,
    private readonly responseMapper: ThreadAiContextResponseMapper,
  ) {}

  @Get(':threadId/ai-context')
  @ApiOperation({ summary: 'Get the AI resources available in a thread' })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ThreadAiContextResponseDto })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async getAiContext(
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
  ): Promise<ThreadAiContextResponseDto> {
    this.logger.log({ threadId }, 'Getting thread AI context');
    const context = await this.getThreadAiContext.execute(
      new GetThreadAiContextQuery(threadId),
    );
    return this.responseMapper.toDto(context);
  }
}
