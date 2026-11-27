import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { EMPTY_SYNCED_FILES_SUMMARY } from 'src/domain/knowledge-base-sync/application/models/synced-files-summary';
import { AddSyncedLocationCommand } from 'src/domain/knowledge-base-sync/application/use-cases/add-synced-location/add-synced-location.command';
import { AddSyncedLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/add-synced-location/add-synced-location.use-case';
import { ListSyncedLocationsQuery } from 'src/domain/knowledge-base-sync/application/use-cases/list-synced-locations/list-synced-locations.query';
import { ListSyncedLocationsUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/list-synced-locations/list-synced-locations.use-case';
import { RemoveSyncedLocationCommand } from 'src/domain/knowledge-base-sync/application/use-cases/remove-synced-location/remove-synced-location.command';
import { RemoveSyncedLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/remove-synced-location/remove-synced-location.use-case';
import { SyncLocationNowCommand } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location-now/sync-location-now.command';
import { SyncLocationNowUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location-now/sync-location-now.use-case';
import { AddSyncedLocationDto } from './dto/add-synced-location.dto';
import {
  SyncedLocationListResponseDto,
  SyncedLocationResponseDto,
} from './dto/synced-location-response.dto';
import {
  toSyncedLocationDto,
  toSyncedLocationListDto,
} from './mappers/synced-location-dto.mapper';

const KB_ID_PARAM = {
  name: 'id',
  description: 'The UUID of the knowledge base',
  type: 'string',
  format: 'uuid',
} as const;
const LOCATION_ID_PARAM = {
  name: 'locationId',
  description: 'The UUID of the synced location',
  type: 'string',
  format: 'uuid',
} as const;

/**
 * Locations a knowledge base syncs. Readers of the knowledge base see them;
 * whoever may change its documents adds, syncs and removes them. Not behind a
 * feature flag: the use cases leave out the locations of switched-off
 * providers.
 */
@ApiTags('knowledge-bases')
@Controller('knowledge-bases')
export class KnowledgeBaseSyncedLocationsController {
  constructor(
    private readonly listSyncedLocationsUseCase: ListSyncedLocationsUseCase,
    private readonly addSyncedLocationUseCase: AddSyncedLocationUseCase,
    private readonly syncLocationNowUseCase: SyncLocationNowUseCase,
    private readonly removeSyncedLocationUseCase: RemoveSyncedLocationUseCase,
  ) {}

  @Get(':id/synced-locations')
  @ApiOperation({
    summary: 'List the synced locations of a knowledge base',
    description:
      'Each location with its sync state and what its files amount to, and the products whose locations can be added.',
  })
  @ApiParam(KB_ID_PARAM)
  @ApiResponse({ status: 200, type: SyncedLocationListResponseDto })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  async list(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<SyncedLocationListResponseDto> {
    return toSyncedLocationListDto(
      await this.listSyncedLocationsUseCase.execute(
        new ListSyncedLocationsQuery(id),
      ),
    );
  }

  @Post(':id/synced-locations')
  @ApiOperation({
    summary: 'Add a synced location to a knowledge base',
    description:
      'Every file below the location becomes a document of the knowledge base, within its document limit. The first sync starts right away.',
  })
  @ApiParam(KB_ID_PARAM)
  @ApiResponse({ status: 201, type: SyncedLocationResponseDto })
  @ApiResponse({
    status: 404,
    description:
      'Knowledge base not found, or the product is not set up (CONNECTOR_NOT_SET_UP)',
  })
  @ApiResponse({
    status: 409,
    description:
      'The knowledge base already syncs the location (SYNCED_LOCATION_ALREADY_EXISTS)',
  })
  async add(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: AddSyncedLocationDto,
  ): Promise<SyncedLocationResponseDto> {
    const location = await this.addSyncedLocationUseCase.execute(
      new AddSyncedLocationCommand({
        knowledgeBaseId: id,
        product: dto.product,
        location: dto.location,
      }),
    );
    return toSyncedLocationDto({
      location,
      product: dto.product,
      files: EMPTY_SYNCED_FILES_SUMMARY,
    });
  }

  @Post(':id/synced-locations/:locationId/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Sync a location now',
    description:
      'Queues a sync unless one is queued or running; a paused location syncs once its pause ends.',
  })
  @ApiParam(KB_ID_PARAM)
  @ApiParam(LOCATION_ID_PARAM)
  @ApiResponse({ status: 202 })
  @ApiResponse({ status: 404, description: 'Synced location not found' })
  async syncNow(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('locationId', ParseUUIDPipe) locationId: UUID,
  ): Promise<void> {
    await this.syncLocationNowUseCase.execute(
      new SyncLocationNowCommand({ knowledgeBaseId: id, locationId }),
    );
  }

  @Delete(':id/synced-locations/:locationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a synced location',
    description: 'Removes the location and every document synced from it.',
  })
  @ApiParam(KB_ID_PARAM)
  @ApiParam(LOCATION_ID_PARAM)
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Synced location not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('locationId', ParseUUIDPipe) locationId: UUID,
  ): Promise<void> {
    await this.removeSyncedLocationUseCase.execute(
      new RemoveSyncedLocationCommand({ knowledgeBaseId: id, locationId }),
    );
  }
}
