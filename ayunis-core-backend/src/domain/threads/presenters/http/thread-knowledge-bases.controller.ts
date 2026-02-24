import {
  Controller,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';

import { AddKnowledgeBaseToThreadUseCase } from '../../application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.use-case';
import { AddKnowledgeBaseToThreadCommand } from '../../application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.command';
import { RemoveKnowledgeBaseFromThreadUseCase } from '../../application/use-cases/remove-knowledge-base-from-thread/remove-knowledge-base-from-thread.use-case';
import { RemoveKnowledgeBaseFromThreadCommand } from '../../application/use-cases/remove-knowledge-base-from-thread/remove-knowledge-base-from-thread.command';

@ApiTags('threads')
@Controller('threads')
export class ThreadKnowledgeBasesController {
  private readonly logger = new Logger(ThreadKnowledgeBasesController.name);

  constructor(
    private readonly addKnowledgeBaseToThreadUseCase: AddKnowledgeBaseToThreadUseCase,
    private readonly removeKnowledgeBaseFromThreadUseCase: RemoveKnowledgeBaseFromThreadUseCase,
  ) {}

  @Post(':id/knowledge-bases/:knowledgeBaseId')
  @ApiOperation({ summary: 'Add a knowledge base to a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'The UUID of the knowledge base to add',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The knowledge base has been successfully added to the thread',
  })
  @ApiResponse({
    status: 404,
    description: 'Thread or knowledge base not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async addKnowledgeBase(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.log('addKnowledgeBase', { threadId, knowledgeBaseId });
    await this.addKnowledgeBaseToThreadUseCase.execute(
      new AddKnowledgeBaseToThreadCommand(threadId, knowledgeBaseId),
    );
  }

  @Delete(':id/knowledge-bases/:knowledgeBaseId')
  @ApiOperation({ summary: 'Remove a knowledge base from a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'The UUID of the knowledge base to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description:
      'The knowledge base has been successfully removed from the thread',
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeKnowledgeBase(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.log('removeKnowledgeBase', { threadId, knowledgeBaseId });
    await this.removeKnowledgeBaseFromThreadUseCase.execute(
      new RemoveKnowledgeBaseFromThreadCommand(threadId, knowledgeBaseId),
    );
  }
}
