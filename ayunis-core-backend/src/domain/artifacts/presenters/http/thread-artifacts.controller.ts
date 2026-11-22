import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { AttachArtifactToThreadUseCase } from 'src/domain/artifacts/application/use-cases/attach-artifact-to-thread/attach-artifact-to-thread.use-case';
import { AttachArtifactToThreadCommand } from 'src/domain/artifacts/application/use-cases/attach-artifact-to-thread/attach-artifact-to-thread.command';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

@ApiTags('threads')
@RequireAcademyCertificate()
@Controller('threads')
export class ThreadArtifactsController {
  private readonly logger = new Logger(ThreadArtifactsController.name);

  constructor(
    private readonly attachArtifactToThreadUseCase: AttachArtifactToThreadUseCase,
  ) {}

  @Post(':id/artifacts/:artifactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Attach an artifact to a chat. Personal chats take the personal artifacts of their user, workspace chats the artifacts of their workspace; the artifact must have the chat’s mode (anonymous or normal)',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'artifactId',
    description: 'The UUID of the artifact to attach',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description:
      'The artifact is attached to the thread (also when it was already)',
  })
  @ApiResponse({
    status: 400,
    description:
      'The artifact belongs to another scope or has another mode than the thread',
  })
  @ApiResponse({ status: 404, description: 'Thread or artifact not found' })
  async attach(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('artifactId', ParseUUIDPipe) artifactId: UUID,
  ): Promise<void> {
    this.logger.log({ threadId, artifactId }, 'attach');
    await this.attachArtifactToThreadUseCase.execute(
      new AttachArtifactToThreadCommand({ threadId, artifactId }),
    );
  }
}
