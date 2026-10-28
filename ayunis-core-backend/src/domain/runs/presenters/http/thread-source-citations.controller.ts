import { Controller, Get, Logger, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { GetThreadSourceCitationQuery } from 'src/domain/runs/application/use-cases/get-thread-source-citation/get-thread-source-citation.query';
import { GetThreadSourceCitationUseCase } from 'src/domain/runs/application/use-cases/get-thread-source-citation/get-thread-source-citation.use-case';
import { SourceCitationResponseDto } from './dto/source-citation-response.dto';

@ApiTags('threads')
@RequireAcademyCertificate()
@Controller('threads')
export class ThreadSourceCitationsController {
  private readonly logger = new Logger(ThreadSourceCitationsController.name);

  constructor(
    private readonly getThreadSourceCitationUseCase: GetThreadSourceCitationUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Get(':threadId/source-chunks/:chunkId')
  @ApiOperation({ summary: 'Get a source citation in a thread' })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'chunkId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Returns the cited chunk and source metadata',
    type: SourceCitationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  async getSourceCitation(
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
    @Param('chunkId', ParseUUIDPipe) chunkId: UUID,
  ): Promise<SourceCitationResponseDto> {
    this.logger.log({ threadId, chunkId }, 'getSourceCitation');
    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();
    return this.getThreadSourceCitationUseCase.execute(
      new GetThreadSourceCitationQuery(threadId, chunkId, orgId),
    );
  }
}
