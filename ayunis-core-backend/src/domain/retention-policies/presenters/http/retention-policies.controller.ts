import { Body, Controller, Get, Logger, Put } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetOrgRetentionPolicyUseCase } from '../../application/use-cases/get-org-retention-policy/get-org-retention-policy.use-case';
import { GetOrgRetentionPolicyQuery } from '../../application/use-cases/get-org-retention-policy/get-org-retention-policy.query';
import { UpsertOrgRetentionPolicyUseCase } from '../../application/use-cases/upsert-org-retention-policy/upsert-org-retention-policy.use-case';
import { UpsertOrgRetentionPolicyCommand } from '../../application/use-cases/upsert-org-retention-policy/upsert-org-retention-policy.command';
import { ALLOWED_RETENTION_DAYS } from '../../domain/retention-period';
import { UpdateRetentionPolicyRequestDto } from './dtos/update-retention-policy-request.dto';
import { RetentionPolicyResponseDto } from './dtos/retention-policy-response.dto';

@ApiTags('retention-policies')
@Controller('retention-policies')
@ApiExtraModels(RetentionPolicyResponseDto)
export class RetentionPoliciesController {
  private readonly logger = new Logger(RetentionPoliciesController.name);

  constructor(
    private readonly getOrgRetentionPolicy: GetOrgRetentionPolicyUseCase,
    private readonly upsertOrgRetentionPolicy: UpsertOrgRetentionPolicyUseCase,
  ) {}

  @Get('org')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get the data-retention policy for the current org',
  })
  @ApiResponse({
    status: 200,
    description: 'Current retention policy (disabled if never configured)',
    schema: { $ref: getSchemaPath(RetentionPolicyResponseDto) },
  })
  async get(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<RetentionPolicyResponseDto> {
    this.logger.log(`Getting retention policy for org ${orgId}`);

    const policy = await this.getOrgRetentionPolicy.execute(
      new GetOrgRetentionPolicyQuery(orgId),
    );
    return this.toResponse(policy?.retentionDays ?? null);
  }

  @Put('org')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Set or clear the data-retention policy for the current org',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated retention policy',
    schema: { $ref: getSchemaPath(RetentionPolicyResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description: 'Retention period is not one of the allowed windows',
  })
  async update(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpdateRetentionPolicyRequestDto,
  ): Promise<RetentionPolicyResponseDto> {
    this.logger.log(`Updating retention policy for org ${orgId}`, {
      retentionDays: dto.retentionDays,
    });

    const policy = await this.upsertOrgRetentionPolicy.execute(
      new UpsertOrgRetentionPolicyCommand(orgId, dto.retentionDays),
    );
    return this.toResponse(policy.retentionDays);
  }

  private toResponse(retentionDays: number | null): RetentionPolicyResponseDto {
    return {
      retentionDays,
      enabled: retentionDays !== null,
      allowedRetentionDays: [...ALLOWED_RETENTION_DAYS],
    };
  }
}
