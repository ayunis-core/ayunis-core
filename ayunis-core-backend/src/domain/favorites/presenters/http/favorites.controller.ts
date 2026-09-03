import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Logger,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { FindFavoritesUseCase } from 'src/domain/favorites/application/use-cases/find-favorites/find-favorites.use-case';
import { ReorderFavoritesCommand } from 'src/domain/favorites/application/use-cases/reorder-favorites/reorder-favorites.command';
import { ReorderFavoritesUseCase } from 'src/domain/favorites/application/use-cases/reorder-favorites/reorder-favorites.use-case';
import { ToggleFavoriteCommand } from 'src/domain/favorites/application/use-cases/toggle-favorite/toggle-favorite.command';
import { ToggleFavoriteUseCase } from 'src/domain/favorites/application/use-cases/toggle-favorite/toggle-favorite.use-case';
import {
  ThreadFavoriteResponseDto,
  type FavoriteResponseDto,
  WorkspaceFavoriteResponseDto,
} from './dtos/favorite-response.dto';
import { ReorderFavoritesDto } from './dtos/reorder-favorites.dto';
import { ToggleFavoriteDto } from './dtos/toggle-favorite.dto';

// Favorites currently only surface workspace/thread pinning, which ships
// behind the workspaces flag; the API is gated with it so a disabled feature
// has no reachable server surface.
@ApiTags('favorites')
@ApiExtraModels(WorkspaceFavoriteResponseDto, ThreadFavoriteResponseDto)
@RequireFeature(FeatureFlag.Workspaces)
@Controller('favorites')
export class FavoritesController {
  private readonly logger = new Logger(FavoritesController.name);

  constructor(
    private readonly findFavoritesUseCase: FindFavoritesUseCase,
    private readonly toggleFavoriteUseCase: ToggleFavoriteUseCase,
    private readonly reorderFavoritesUseCase: ReorderFavoritesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user favorites' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(WorkspaceFavoriteResponseDto) },
          { $ref: getSchemaPath(ThreadFavoriteResponseDto) },
        ],
        discriminator: { propertyName: 'referenceType' },
      },
    },
  })
  async findAll(): Promise<FavoriteResponseDto[]> {
    this.logger.log('findAll');
    return this.findFavoritesUseCase.execute();
  }

  @Patch('toggle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Favorite or unfavorite an authorized reference' })
  @ApiResponse({ status: 204, description: 'The favorite was toggled' })
  async toggle(@Body() dto: ToggleFavoriteDto): Promise<void> {
    this.logger.log(dto, 'toggle');
    await this.toggleFavoriteUseCase.execute(
      new ToggleFavoriteCommand(dto.referenceType, dto.referenceId),
    );
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder the current user favorites' })
  @ApiResponse({ status: 204, description: 'The favorites were reordered' })
  async reorder(@Body() dto: ReorderFavoritesDto): Promise<void> {
    this.logger.log({ count: dto.favoriteIds.length }, 'reorder');
    await this.reorderFavoritesUseCase.execute(
      new ReorderFavoritesCommand(dto.favoriteIds),
    );
  }
}
