import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { DecideToolApprovalUseCase } from 'src/domain/runs/application/use-cases/decide-tool-approval/decide-tool-approval.use-case';
import { DecideToolApprovalCommand } from 'src/domain/runs/application/use-cases/decide-tool-approval/decide-tool-approval.command';
import { DecideToolApprovalDto } from './dto/decide-tool-approval.dto';

@ApiTags('runs')
@RequireAcademyCertificate()
@Controller('threads/:threadId/tool-approvals')
export class ToolApprovalsController {
  private readonly logger = new Logger(ToolApprovalsController.name);

  constructor(
    private readonly decideToolApprovalUseCase: DecideToolApprovalUseCase,
  ) {}

  @Post(':toolCallId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Approve or decline a tool call that is waiting for the user',
    description:
      'Resumes the running chat turn that paused on this tool call. Only the user whose run is waiting can decide.',
  })
  @ApiParam({
    name: 'threadId',
    description: 'The UUID of the thread whose run is waiting',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'toolCallId',
    description:
      'Identifier of the tool call as shown in the assistant message',
    type: 'string',
  })
  @ApiResponse({ status: 204, description: 'Decision applied' })
  @ApiResponse({
    status: 404,
    description: 'No tool call with this ID is waiting for this user',
  })
  async decide(
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
    @Param('toolCallId') toolCallId: string,
    @Body() dto: DecideToolApprovalDto,
  ): Promise<void> {
    this.logger.log({ threadId, toolCallId, decision: dto.decision }, 'decide');
    await this.decideToolApprovalUseCase.execute(
      new DecideToolApprovalCommand(threadId, toolCallId, dto.decision),
    );
  }
}
