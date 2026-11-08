import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { UUID } from 'crypto';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { FindActiveThreadRunsUseCase } from 'src/domain/runs/application/use-cases/find-active-thread-runs/find-active-thread-runs.use-case';
import { AttachToThreadRunUseCase } from 'src/domain/runs/application/use-cases/attach-to-thread-run/attach-to-thread-run.use-case';
import { AttachToThreadRunQuery } from 'src/domain/runs/application/use-cases/attach-to-thread-run/attach-to-thread-run.query';
import { CancelThreadRunUseCase } from 'src/domain/runs/application/use-cases/cancel-thread-run/cancel-thread-run.use-case';
import { CancelThreadRunCommand } from 'src/domain/runs/application/use-cases/cancel-thread-run/cancel-thread-run.command';
import { ActiveThreadRunResponseDto } from 'src/domain/runs/presenters/http/dto/active-thread-run-response.dto';
import { RunSsePresenter } from 'src/domain/runs/presenters/http/sse/run-sse.presenter';
import { SEND_MESSAGE_SSE_RESPONSE } from 'src/domain/runs/presenters/http/send-message.swagger';

@ApiTags('runs')
@RequireAcademyCertificate()
@Controller('runs')
export class ActiveRunsController {
  private readonly logger = new Logger(ActiveRunsController.name);

  constructor(
    private readonly findActiveThreadRunsUseCase: FindActiveThreadRunsUseCase,
    private readonly attachToThreadRunUseCase: AttachToThreadRunUseCase,
    private readonly cancelThreadRunUseCase: CancelThreadRunUseCase,
    private readonly ssePresenter: RunSsePresenter,
  ) {}

  @Get('active')
  @ApiOperation({ summary: 'List the current user’s runs in progress' })
  @ApiResponse({ status: 200, type: [ActiveThreadRunResponseDto] })
  async findActive(): Promise<ActiveThreadRunResponseDto[]> {
    const runs = await this.findActiveThreadRunsUseCase.execute();
    return runs.map((run) => ({
      threadId: run.threadId,
      cancellable: run.cancellable,
    }));
  }

  @Get('threads/:threadId/events')
  @ApiOperation({
    summary: 'Attach to the run in progress on a thread',
    description:
      'Streams the run from its start (the latest snapshot of each message) and then live until it ends. Leaving does not stop the run. Responds 204 when the thread has no run in progress.',
  })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiResponse(SEND_MESSAGE_SSE_RESPONSE)
  @ApiResponse({ status: 204, description: 'No run in progress' })
  async attach(
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
    @Res() response: Response,
  ): Promise<void> {
    const subscription = await this.attachToThreadRunUseCase.execute(
      new AttachToThreadRunQuery(threadId),
    );
    if (!subscription) {
      response.status(HttpStatus.NO_CONTENT).end();
      return;
    }
    this.logger.log({ threadId }, 'Attached to thread run');
    await this.ssePresenter.stream(response, threadId, subscription);
  }

  @Post('threads/:threadId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Stop the run in progress on a thread',
    description:
      'The run rolls back its unfinished turn. Succeeds when there is nothing to stop.',
  })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Run stopped or none in progress' })
  async cancel(
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
  ): Promise<void> {
    await this.cancelThreadRunUseCase.execute(
      new CancelThreadRunCommand(threadId),
    );
  }
}
