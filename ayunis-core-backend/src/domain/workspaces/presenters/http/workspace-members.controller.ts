import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { AddWorkspaceMembersCommand } from 'src/domain/workspaces/application/use-cases/add-workspace-members/add-workspace-members.command';
import { AddWorkspaceMembersUseCase } from 'src/domain/workspaces/application/use-cases/add-workspace-members/add-workspace-members.use-case';
import { ListWorkspaceMemberCandidatesQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-member-candidates/list-workspace-member-candidates.query';
import { ListWorkspaceMemberCandidatesUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-member-candidates/list-workspace-member-candidates.use-case';
import { ListWorkspaceMembersQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-members/list-workspace-members.query';
import { ListWorkspaceMembersUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-members/list-workspace-members.use-case';
import { UpdateWorkspaceMemberRoleCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-member-role/update-workspace-member-role.command';
import { UpdateWorkspaceMemberRoleUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-member-role/update-workspace-member-role.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { AddWorkspaceMembersDto } from './dtos/add-workspace-members.dto';
import { ListWorkspaceMemberCandidatesQueryParamsDto } from './dtos/list-workspace-member-candidates-query-params.dto';
import { UpdateWorkspaceMemberRoleDto } from './dtos/update-workspace-member-role.dto';
import { WorkspaceMemberCandidateResponseDto } from './dtos/workspace-member-candidate-response.dto';
import { WorkspaceMemberResponseDto } from './dtos/workspace-member-response.dto';
import { WorkspaceMemberDtoMapper } from './mappers/workspace-member-dto.mapper';

const workspaceIdParam = {
  name: 'id',
  description: 'The UUID of the workspace',
  type: 'string',
  format: 'uuid',
} as const;

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspaceMembersController {
  private readonly logger = new Logger(WorkspaceMembersController.name);

  constructor(
    private readonly listWorkspaceMembersUseCase: ListWorkspaceMembersUseCase,
    private readonly listWorkspaceMemberCandidatesUseCase: ListWorkspaceMemberCandidatesUseCase,
    private readonly addWorkspaceMembersUseCase: AddWorkspaceMembersUseCase,
    private readonly updateWorkspaceMemberRoleUseCase: UpdateWorkspaceMemberRoleUseCase,
    private readonly mapper: WorkspaceMemberDtoMapper,
  ) {}

  @Get(':id/members')
  @ApiOperation({ summary: 'List the members of a workspace' })
  @ApiParam(workspaceIdParam)
  @ApiResponse({ status: 200, type: [WorkspaceMemberResponseDto] })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async list(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceMemberResponseDto[]> {
    this.logger.log({ id }, 'list');
    const members = await this.listWorkspaceMembersUseCase.execute(
      new ListWorkspaceMembersQuery(id),
    );
    return this.mapper.toDtoList(members);
  }

  @Get(':id/member-candidates')
  @ApiOperation({
    summary: 'Search colleagues who can be added to a workspace',
    description:
      'Returns up to 25 users of the organization who are not members yet, ' +
      'matching the search by name or email.',
  })
  @ApiParam(workspaceIdParam)
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: [WorkspaceMemberCandidateResponseDto] })
  @ApiResponse({ status: 403, description: 'Not allowed to add members' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async listCandidates(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: ListWorkspaceMemberCandidatesQueryParamsDto,
  ): Promise<WorkspaceMemberCandidateResponseDto[]> {
    this.logger.log({ id }, 'listCandidates');
    const candidates = await this.listWorkspaceMemberCandidatesUseCase.execute(
      new ListWorkspaceMemberCandidatesQuery(
        id,
        queryParams.search?.trim() || undefined,
      ),
    );
    return this.mapper.toCandidateDtoList(candidates);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Add users of the organization to a workspace',
    description:
      'Adds every listed user with one role. Users who already are members ' +
      'are skipped and keep their role; the response holds only the members ' +
      'added. Unknown users and users of another organization reject the ' +
      'whole request.',
  })
  @ApiParam(workspaceIdParam)
  @ApiResponse({ status: 201, type: [WorkspaceMemberResponseDto] })
  @ApiResponse({
    status: 400,
    description: 'A user is not part of the organization',
  })
  @ApiResponse({
    status: 403,
    description:
      'Not allowed to add members, or to assign admin as a non-admin',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async add(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: AddWorkspaceMembersDto,
  ): Promise<WorkspaceMemberResponseDto[]> {
    this.logger.log({ id, count: dto.userIds.length, role: dto.role }, 'add');
    const added = await this.addWorkspaceMembersUseCase.execute(
      new AddWorkspaceMembersCommand({
        workspaceId: id,
        userIds: dto.userIds,
        role: dto.role ?? UserRole.USER,
      }),
    );
    return this.mapper.toDtoList(added);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: "Change a member's role in a workspace" })
  @ApiParam(workspaceIdParam)
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkspaceMemberResponseDto })
  @ApiResponse({ status: 403, description: 'Not a workspace admin' })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found or user is not a member',
  })
  @ApiResponse({
    status: 409,
    description: 'The change would leave the workspace without an admin',
  })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ): Promise<WorkspaceMemberResponseDto> {
    this.logger.log({ id, userId, role: dto.role }, 'updateRole');
    const member = await this.updateWorkspaceMemberRoleUseCase.execute(
      new UpdateWorkspaceMemberRoleCommand({
        workspaceId: id,
        userId,
        role: dto.role,
      }),
    );
    return this.mapper.toDto(member);
  }
}
