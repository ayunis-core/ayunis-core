import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ListOwnershipCandidatesUseCase } from 'src/domain/workspaces/application/use-cases/list-ownership-candidates/list-ownership-candidates.use-case';
import { TransferWorkspaceOwnershipCommand } from 'src/domain/workspaces/application/use-cases/transfer-workspace-ownership/transfer-workspace-ownership.command';
import { TransferWorkspaceOwnershipUseCase } from 'src/domain/workspaces/application/use-cases/transfer-workspace-ownership/transfer-workspace-ownership.use-case';
import {
  OwnershipCandidatesResponseDto,
  TransferWorkspaceOwnershipDto,
} from './dtos/workspace-ownership.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';
import { WorkspaceDtoMapper } from './mappers/workspace-dto.mapper';

@ApiTags('workspace-ownership')
@Controller('workspaces/:id/ownership')
export class WorkspaceOwnershipController {
  constructor(
    private readonly listCandidates: ListOwnershipCandidatesUseCase,
    private readonly transfer: TransferWorkspaceOwnershipUseCase,
    private readonly mapper: WorkspaceDtoMapper,
  ) {}

  @Get('candidates')
  @ApiOperation({ summary: 'Who the owner may hand the workspace over to' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OwnershipCandidatesResponseDto })
  @ApiResponse({ status: 403, description: 'The caller is not the owner' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async candidates(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<OwnershipCandidatesResponseDto> {
    return { people: await this.listCandidates.execute({ workspaceId: id }) };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Hand the workspace over; the previous owner keeps full access (Vollzugriff)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The workspace as the previous owner now sees it',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({ status: 403, description: 'The caller is not the owner' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiResponse({
    status: 422,
    description: 'The person has no access to the workspace',
  })
  async transferOwnership(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: TransferWorkspaceOwnershipDto,
  ): Promise<WorkspaceResponseDto> {
    return this.mapper.toDetailDto(
      await this.transfer.execute(
        new TransferWorkspaceOwnershipCommand(id, dto.userId),
      ),
    );
  }
}
