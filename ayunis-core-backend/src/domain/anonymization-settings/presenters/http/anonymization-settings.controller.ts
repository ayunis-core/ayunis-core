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
import { GetPiiWhitelistUseCase } from '../../application/use-cases/get-pii-whitelist/get-pii-whitelist.use-case';
import { GetPiiWhitelistQuery } from '../../application/use-cases/get-pii-whitelist/get-pii-whitelist.query';
import { UpdatePiiWhitelistUseCase } from '../../application/use-cases/update-pii-whitelist/update-pii-whitelist.use-case';
import { UpdatePiiWhitelistCommand } from '../../application/use-cases/update-pii-whitelist/update-pii-whitelist.command';
import { UpdatePiiWhitelistRequestDto } from './dtos/update-pii-whitelist-request.dto';
import { PiiWhitelistResponseDto } from './dtos/pii-whitelist-response.dto';
import type { AnonymizationWhitelistEntry } from '../../domain/anonymization-whitelist-entry.entity';

@ApiTags('anonymization-settings')
@Controller('anonymization-settings')
@ApiExtraModels(PiiWhitelistResponseDto)
export class AnonymizationSettingsController {
  private readonly logger = new Logger(AnonymizationSettingsController.name);

  constructor(
    private readonly getPiiWhitelistUseCase: GetPiiWhitelistUseCase,
    private readonly updatePiiWhitelistUseCase: UpdatePiiWhitelistUseCase,
  ) {}

  @Get('pii-whitelist')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the PII whitelist for the current org' })
  @ApiResponse({
    status: 200,
    description: 'Current PII whitelist (empty list if none)',
    schema: { $ref: getSchemaPath(PiiWhitelistResponseDto) },
  })
  async get(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PiiWhitelistResponseDto> {
    this.logger.log(`Getting PII whitelist for org ${orgId}`);

    const entries = await this.getPiiWhitelistUseCase.execute(
      new GetPiiWhitelistQuery(orgId),
    );
    return this.toResponse(entries);
  }

  @Put('pii-whitelist')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Replace the PII whitelist for the current org' })
  @ApiResponse({
    status: 200,
    description: 'Updated PII whitelist',
    schema: { $ref: getSchemaPath(PiiWhitelistResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or unsafe regex pattern, or duplicate category',
  })
  async update(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpdatePiiWhitelistRequestDto,
  ): Promise<PiiWhitelistResponseDto> {
    this.logger.log(`Updating PII whitelist for org ${orgId}`);

    const entries = await this.updatePiiWhitelistUseCase.execute(
      new UpdatePiiWhitelistCommand(
        orgId,
        dto.entries.map((entry) => ({
          category: entry.category,
          pattern: entry.pattern ?? null,
        })),
      ),
    );
    return this.toResponse(entries);
  }

  private toResponse(
    entries: AnonymizationWhitelistEntry[],
  ): PiiWhitelistResponseDto {
    return {
      entries: entries.map((entry) => ({
        category: entry.category,
        pattern: entry.pattern,
      })),
    };
  }
}
