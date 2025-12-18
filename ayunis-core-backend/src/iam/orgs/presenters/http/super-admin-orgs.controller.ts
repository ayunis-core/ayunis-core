import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SuperAdminGetAllOrgsUseCase } from '../../application/use-cases/super-admin-get-all-orgs/super-admin-get-all-orgs.use-case';
import { SuperAdminOrgResponseDtoMapper } from './mappers/super-admin-org-response-dto.mapper';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgResponseDto,
} from './dtos/super-admin-org-response.dto';
import { UUID } from 'crypto';
import { FindOrgByIdQuery } from '../../application/use-cases/find-org-by-id/find-org-by-id.query';
import { FindOrgByIdUseCase } from '../../application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { CreateOrgUseCase } from '../../application/use-cases/create-org/create-org.use-case';
import { CreateOrgCommand } from '../../application/use-cases/create-org/create-org.command';
import { CreateOrgRequestDto } from './dtos/create-org-request.dto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SuperAdminGetAllOrgsQueryParamsDto } from './dtos/super-admin-get-all-orgs-query-params.dto';
import { SuperAdminGetAllOrgsQuery } from '../../application/use-cases/super-admin-get-all-orgs/super-admin-get-all-orgs.query';

@ApiTags('Super Admin Orgs')
@Controller('super-admin/orgs')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminOrgsController {
  private readonly logger = new Logger(SuperAdminOrgsController.name);

  constructor(
    private readonly superAdminGetAllOrgsUseCase: SuperAdminGetAllOrgsUseCase,
    private readonly superAdminOrgResponseDtoMapper: SuperAdminOrgResponseDtoMapper,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly createOrgUseCase: CreateOrgUseCase,
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
    this.logger.log('Creating organization', { name: createOrgDto.name });

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
    description: 'Search organizations by name.',
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
    const orgs = await this.superAdminGetAllOrgsUseCase.execute(
      new SuperAdminGetAllOrgsQuery({
        search: queryParams.search,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
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
    type: SuperAdminOrgResponseDto,
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
  async getOrgById(@Param('id') id: UUID): Promise<SuperAdminOrgResponseDto> {
    const org = await this.findOrgByIdUseCase.execute(new FindOrgByIdQuery(id));
    return this.superAdminOrgResponseDtoMapper.toDto(org);
  }
}
