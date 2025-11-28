import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

// Import use cases
import { CreateShareUseCase } from '../../application/use-cases/create-share/create-share.use-case';
import { CreateAgentShareCommand } from '../../application/use-cases/create-share/create-share.command';
import { DeleteShareUseCase } from '../../application/use-cases/delete-share/delete-share.use-case';
import { GetSharesUseCase } from '../../application/use-cases/get-shares/get-shares.use-case';
import { GetSharesQuery } from '../../application/use-cases/get-shares/get-shares.query';

// Import DTOs and mappers
import { ShareResponseDto } from './dto/share-response.dto';
import { CreateAgentShareDto } from './dto/create-share.dto';
import { ShareDtoMapper } from './mappers/share-dto.mapper';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';

@ApiTags('shares')
@Controller('shares')
export class SharesController {
  private readonly logger = new Logger(SharesController.name);

  constructor(
    private readonly createShareUseCase: CreateShareUseCase,
    private readonly deleteShareUseCase: DeleteShareUseCase,
    private readonly getSharesUseCase: GetSharesUseCase,
    private readonly shareDtoMapper: ShareDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a share for an agent' })
  @ApiBody({
    description: 'Share creation data',
    type: CreateAgentShareDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Share created successfully',
    type: ShareResponseDto,
  })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User cannot create share for this entity',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createShare(
    @Body() createShareDto: CreateAgentShareDto,
  ): Promise<ShareResponseDto> {
    this.logger.log('createShare', {
      entityType: createShareDto.entityType,
      agentId: createShareDto.agentId,
    });

    // Create command based on entity type
    const command = new CreateAgentShareCommand(createShareDto.agentId as UUID);

    // Execute use case
    const share = await this.createShareUseCase.execute(command);

    // Map to response DTO
    return this.shareDtoMapper.toDto(share);
  }

  @Get()
  @ApiOperation({ summary: 'Get shares for an entity' })
  @ApiQuery({
    name: 'entityId',
    required: true,
    type: 'string',
    format: 'uuid',
    description: 'ID of the entity to get shares for',
  })
  @ApiQuery({
    name: 'entityType',
    required: true,
    enum: SharedEntityType,
    description: 'Type of the entity',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns shares for the specified entity',
    type: [ShareResponseDto],
  })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User cannot view shares for this entity',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getShares(
    @Query('entityId', ParseUUIDPipe) entityId: UUID,
    @Query('entityType') entityType: SharedEntityType,
  ): Promise<ShareResponseDto[]> {
    this.logger.log('getShares', { entityId, entityType });

    const shares = await this.getSharesUseCase.execute(
      new GetSharesQuery(entityId, entityType),
    );

    return this.shareDtoMapper.toDtoArray(shares);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a share' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the share to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The share has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShare(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('deleteShare', { id });

    await this.deleteShareUseCase.execute(id);
  }
}
