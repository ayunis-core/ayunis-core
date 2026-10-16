import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SuperAdminGetAllOrgsUseCase } from 'src/iam/orgs/application/use-cases/super-admin-get-all-orgs/super-admin-get-all-orgs.use-case';
import { OrgErrorResponseDto } from './dtos/org-error-response.dto';
import { SuperAdminOrgResponseDtoMapper } from './mappers/super-admin-org-response-dto.mapper';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgOverviewResponseDto,
  SuperAdminOrgResponseDto,
} from './dtos/super-admin-org-response.dto';
import { UUID } from 'crypto';
import { SuperAdminGetOrgQuery } from 'src/iam/orgs/application/use-cases/super-admin-get-org/super-admin-get-org.query';
import { SuperAdminGetOrgUseCase } from 'src/iam/orgs/application/use-cases/super-admin-get-org/super-admin-get-org.use-case';
import { CreateOrgUseCase } from 'src/iam/orgs/application/use-cases/create-org/create-org.use-case';
import { CreateOrgCommand } from 'src/iam/orgs/application/use-cases/create-org/create-org.command';
import { CreateOrgRequestDto } from './dtos/create-org-request.dto';
import { UpdateOrgUseCase } from 'src/iam/orgs/application/use-cases/update-org/update-org.use-case';
import { UpdateOrgCommand } from 'src/iam/orgs/application/use-cases/update-org/update-org.command';
import { UpdateOrgRequestDto } from './dtos/update-org-request.dto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SuperAdminGetAllOrgsQueryParamsDto } from './dtos/super-admin-get-all-orgs-query-params.dto';
import { SuperAdminGetAllOrgsQuery } from 'src/iam/orgs/application/use-cases/super-admin-get-all-orgs/super-admin-get-all-orgs.query';

@ApiTags('Super Admin Orgs')
@Controller('super-admin/orgs')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminOrgsController {
  private readonly logger = new Logger(SuperAdminOrgsController.name);

  constructor(
    private readonly superAdminGetAllOrgsUseCase: SuperAdminGetAllOrgsUseCase,
    private readonly superAdminOrgResponseDtoMapper: SuperAdminOrgResponseDtoMapper,
    private readonly superAdminGetOrgUseCase: SuperAdminGetOrgUseCase,
    private readonly createOrgUseCase: CreateOrgUseCase,
    private readonly updateOrgUseCase: UpdateOrgUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new organization',
    description:
      'Create a new organization in the system. Only accessible to users with the super admin system role.',
  })
  @ApiBody({
    type: CreateOrgRequestDto,
    description: 'Organization information',
  })
  @ApiCreatedResponse({
    description: 'Successfully created organization for the super admin.',
    type: SuperAdminOrgResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors.',
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  async createOrg(
    @Body() createOrgDto: CreateOrgRequestDto,
  ): Promise<SuperAdminOrgResponseDto> {
    this.logger.log({ name: createOrgDto.name }, 'Creating organization');

    const command = new CreateOrgCommand(createOrgDto.name);
    const org = await this.createOrgUseCase.execute(command);
    return this.superAdminOrgResponseDtoMapper.toDto(org);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all organizations',
    description:
      'Retrieve paginated organizations in the system. Only accessible to users with the super admin system role.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved organizations for the super admin.',
    type: SuperAdminOrgListResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search organizations by name, or by exact organization ID.',
    example: 'Acme',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of organizations to return (default: 50).',
    example: 25,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of organizations to skip (default: 0).',
    example: 0,
  })
  async getAllOrgs(
    @Query() queryParams: SuperAdminGetAllOrgsQueryParamsDto,
  ): Promise<SuperAdminOrgListResponseDto> {
    const { limit, offset, ...filters } = queryParams;
    const orgs = await this.superAdminGetAllOrgsUseCase.execute(
      new SuperAdminGetAllOrgsQuery({
        ...filters,
        pagination: { limit, offset },
      }),
    );

    return this.superAdminOrgResponseDtoMapper.toPaginatedDto(orgs);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get an organization by ID',
    description:
      'Retrieve an organization by its ID. Only accessible to users with the super admin system role.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved organization for the super admin.',
    type: SuperAdminOrgOverviewResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'The ID of the organization to retrieve.',
  })
  async getOrgById(
    @Param('id') id: UUID,
  ): Promise<SuperAdminOrgOverviewResponseDto> {
    const overview = await this.superAdminGetOrgUseCase.execute(
      new SuperAdminGetOrgQuery(id),
    );
    return this.superAdminOrgResponseDtoMapper.toOverviewDto(overview);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rename an organization',
    description:
      'Update an organization display name. Only accessible to users with the super admin system role.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'The ID of the organization to update.',
  })
  @ApiBody({
    type: UpdateOrgRequestDto,
    description: 'Organization information',
  })
  @ApiOkResponse({
    description: 'Successfully updated organization for the super admin.',
    type: SuperAdminOrgResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors.',
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  @ApiNotFoundResponse({
    description: 'The organization does not exist.',
    type: OrgErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({ type: OrgErrorResponseDto })
  async updateOrg(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() updateOrgDto: UpdateOrgRequestDto,
  ): Promise<SuperAdminOrgResponseDto> {
    this.logger.log({ id, name: updateOrgDto.name }, 'Updating organization');

    const org = await this.updateOrgUseCase.execute(
      new UpdateOrgCommand(id, updateOrgDto.name),
    );
    return this.superAdminOrgResponseDtoMapper.toDto(org);
  }
}
