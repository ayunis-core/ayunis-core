import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { KnowledgeBaseResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-response.dto';
import { KnowledgeBaseDtoMapper } from 'src/domain/knowledge-bases/presenters/http/mappers/knowledge-base-dto.mapper';
import { AddKnowledgeBaseToRoutineUseCase } from 'src/domain/routines/application/use-cases/add-knowledge-base-to-routine/add-knowledge-base-to-routine.use-case';
import { AddKnowledgeBaseToRoutineCommand } from 'src/domain/routines/application/use-cases/add-knowledge-base-to-routine/add-knowledge-base-to-routine.command';
import { RemoveKnowledgeBaseFromRoutineUseCase } from 'src/domain/routines/application/use-cases/remove-knowledge-base-from-routine/remove-knowledge-base-from-routine.use-case';
import { RemoveKnowledgeBaseFromRoutineCommand } from 'src/domain/routines/application/use-cases/remove-knowledge-base-from-routine/remove-knowledge-base-from-routine.command';
import { ListRoutineKnowledgeBasesUseCase } from 'src/domain/routines/application/use-cases/list-routine-knowledge-bases/list-routine-knowledge-bases.use-case';
import { ListRoutineKnowledgeBasesQuery } from 'src/domain/routines/application/use-cases/list-routine-knowledge-bases/list-routine-knowledge-bases.query';

const ROUTINE_ID_PARAM = {
  name: 'routineId',
  description: 'The UUID of the routine',
  type: 'string',
  format: 'uuid',
} as const;

const KNOWLEDGE_BASE_ID_PARAM = {
  name: 'knowledgeBaseId',
  description: 'The UUID of the knowledge base',
  type: 'string',
  format: 'uuid',
} as const;

@ApiTags('routines')
@RequireFeature(FeatureFlag.Routines)
@RequireAcademyCertificate()
@RequirePermission(Permission.MANAGE_ROUTINES)
@ApiResponse({
  status: 403,
  description: 'The manage routines permission is required',
})
@Controller('routines')
export class RoutineKnowledgeBasesController {
  private readonly logger = new Logger(RoutineKnowledgeBasesController.name);

  constructor(
    private readonly listRoutineKnowledgeBasesUseCase: ListRoutineKnowledgeBasesUseCase,
    private readonly addKnowledgeBaseToRoutineUseCase: AddKnowledgeBaseToRoutineUseCase,
    private readonly removeKnowledgeBaseFromRoutineUseCase: RemoveKnowledgeBaseFromRoutineUseCase,
    private readonly knowledgeBaseDtoMapper: KnowledgeBaseDtoMapper,
  ) {}

  @Get(':routineId/knowledge-bases')
  @ApiOperation({
    summary: "List a routine's knowledge bases",
    description:
      'Only the ones the user can still access; a knowledge base whose share was revoked is left out, and is back once it is shared again.',
  })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiResponse({ status: 200, type: [KnowledgeBaseResponseDto] })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async list(
    @Param('routineId', ParseUUIDPipe) routineId: UUID,
  ): Promise<KnowledgeBaseResponseDto[]> {
    this.logger.log({ routineId }, 'list');
    const contexts = await this.listRoutineKnowledgeBasesUseCase.execute(
      new ListRoutineKnowledgeBasesQuery(routineId),
    );
    return contexts.map(
      ({ knowledgeBase, isActive, isShared, documentCount }) =>
        this.knowledgeBaseDtoMapper.toDto(knowledgeBase, {
          isActive,
          isShared,
          documentCount,
        }),
    );
  }

  @Post(':routineId/knowledge-bases/:knowledgeBaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add a knowledge base to a routine',
    description:
      'A personal knowledge base the user owns or that is shared with them. Adding one the routine already has changes nothing.',
  })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiParam(KNOWLEDGE_BASE_ID_PARAM)
  @ApiResponse({ status: 204, description: 'Knowledge base added' })
  @ApiResponse({
    status: 404,
    description:
      'Routine not found, or no personal knowledge base the user can access',
  })
  async add(
    @Param('routineId', ParseUUIDPipe) routineId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.log({ routineId, knowledgeBaseId }, 'add');
    await this.addKnowledgeBaseToRoutineUseCase.execute(
      new AddKnowledgeBaseToRoutineCommand(routineId, knowledgeBaseId),
    );
  }

  @Delete(':routineId/knowledge-bases/:knowledgeBaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a knowledge base from a routine' })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiParam(KNOWLEDGE_BASE_ID_PARAM)
  @ApiResponse({ status: 204, description: 'Knowledge base removed' })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async remove(
    @Param('routineId', ParseUUIDPipe) routineId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.log({ routineId, knowledgeBaseId }, 'remove');
    await this.removeKnowledgeBaseFromRoutineUseCase.execute(
      new RemoveKnowledgeBaseFromRoutineCommand(routineId, knowledgeBaseId),
    );
  }
}
