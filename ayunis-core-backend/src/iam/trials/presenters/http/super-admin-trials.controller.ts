import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiExtraModels,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { CreateTrialUseCase } from '../../application/use-cases/create-trial/create-trial.use-case';
import { CreateTrialCommand } from '../../application/use-cases/create-trial/create-trial.command';
import { GetTrialUseCase } from '../../application/use-cases/get-trial/get-trial.use-case';
import { GetTrialQuery } from '../../application/use-cases/get-trial/get-trial.query';
import { UpdateTrialUseCase } from '../../application/use-cases/update-trial/update-trial.use-case';
import { UpdateTrialCommand } from '../../application/use-cases/update-trial/update-trial.command';
import { CreateTrialRequestDto } from './dtos/create-trial-request.dto';
import { UpdateTrialRequestDto } from './dtos/update-trial-request.dto';
import {
  SuperAdminTrialResponseDto,
  SuperAdminTrialResponseDtoNullable,
} from './dtos/super-admin-trial-response.dto';
import { SuperAdminTrialResponseDtoMapper } from './mappers/super-admin-trial-response-dto.mapper';
import { TrialNotFoundError } from '../../application/trial.errors';

@ApiTags('Super Admin Trials')
@Controller('super-admin/trials')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  SuperAdminTrialResponseDto,
  SuperAdminTrialResponseDtoNullable,
  CreateTrialRequestDto,
  UpdateTrialRequestDto,
)
export class SuperAdminTrialsController {
  private readonly logger = new Logger(SuperAdminTrialsController.name);

  constructor(
    private readonly createTrialUseCase: CreateTrialUseCase,
    private readonly getTrialUseCase: GetTrialUseCase,
    private readonly updateTrialUseCase: UpdateTrialUseCase,
    private readonly superAdminTrialResponseDtoMapper: SuperAdminTrialResponseDtoMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new trial',
    description:
      'Create a new trial for an organization. Only accessible to users with the super admin system role.',
  })
  @ApiBody({
    type: CreateTrialRequestDto,
    description: 'Trial information',
  })
  @ApiCreatedResponse({
    description: 'Successfully created trial for the super admin.',
    type: SuperAdminTrialResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors.',
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  async createTrial(
    @Body() createTrialDto: CreateTrialRequestDto,
  ): Promise<SuperAdminTrialResponseDto> {
    this.logger.log('Creating trial', {
      orgId: createTrialDto.orgId,
      maxMessages: createTrialDto.maxMessages,
    });

    const command = new CreateTrialCommand(
      createTrialDto.orgId,
      createTrialDto.maxMessages,
    );
    const trial = await this.createTrialUseCase.execute(command);
    return this.superAdminTrialResponseDtoMapper.toDto(trial);
  }

  @Get(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a trial by organization ID',
    description:
      'Retrieve a trial by its organization ID. Only accessible to users with the super admin system role.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved trial for the super admin.',
    type: SuperAdminTrialResponseDtoNullable,
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  @ApiBadRequestResponse({
    description: 'Trial not found for the organization.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'The organization ID of the trial to retrieve.',
  })
  async getTrialByOrgId(
    @Param('orgId') orgId: UUID,
  ): Promise<SuperAdminTrialResponseDtoNullable> {
    try {
      const trial = await this.getTrialUseCase.execute(
        new GetTrialQuery(orgId),
      );
      return { trial: this.superAdminTrialResponseDtoMapper.toDto(trial) };
    } catch (error) {
      if (error instanceof TrialNotFoundError) {
        return { trial: undefined };
      } else {
        throw error;
      }
    }
  }

  @Put(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a trial',
    description:
      'Update a trial for an organization. Can update maxMessages and/or messagesSent. Only accessible to users with the super admin system role.',
  })
  @ApiBody({
    type: UpdateTrialRequestDto,
    description: 'Trial update information',
  })
  @ApiOkResponse({
    description: 'Successfully updated trial for the super admin.',
    type: SuperAdminTrialResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors.',
  })
  @ApiForbiddenResponse({
    description: 'The requester is not a super admin.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'The organization ID of the trial to update.',
  })
  async updateTrial(
    @Param('orgId') orgId: UUID,
    @Body() updateTrialDto: UpdateTrialRequestDto,
  ): Promise<SuperAdminTrialResponseDto> {
    this.logger.log('Updating trial', {
      orgId,
      maxMessages: updateTrialDto.maxMessages,
      messagesSent: updateTrialDto.messagesSent,
    });

    const command = new UpdateTrialCommand(
      orgId,
      updateTrialDto.maxMessages,
      updateTrialDto.messagesSent,
    );
    const trial = await this.updateTrialUseCase.execute(command);
    return this.superAdminTrialResponseDtoMapper.toDto(trial);
  }
}
