import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { FindFavoritesUseCase } from '../../application/use-cases/find-favorites/find-favorites.use-case';
import { ReorderFavoritesCommand } from '../../application/use-cases/reorder-favorites/reorder-favorites.command';
import { ReorderFavoritesUseCase } from '../../application/use-cases/reorder-favorites/reorder-favorites.use-case';
import { ToggleFavoriteCommand } from '../../application/use-cases/toggle-favorite/toggle-favorite.command';
import { ToggleFavoriteUseCase } from '../../application/use-cases/toggle-favorite/toggle-favorite.use-case';
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
  constructor(
    @InjectPinoLogger(FavoritesController.name)
    private readonly logger: PinoLogger,
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
    this.logger.info('findAll');
    return this.findFavoritesUseCase.execute();
  }

  @Patch('toggle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Favorite or unfavorite an authorized reference' })
  @ApiResponse({ status: 204, description: 'The favorite was toggled' })
  async toggle(@Body() dto: ToggleFavoriteDto): Promise<void> {
    this.logger.info(dto, 'toggle');
    await this.toggleFavoriteUseCase.execute(
      new ToggleFavoriteCommand(dto.referenceType, dto.referenceId),
    );
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder the current user favorites' })
  @ApiResponse({ status: 204, description: 'The favorites were reordered' })
  async reorder(@Body() dto: ReorderFavoritesDto): Promise<void> {
    this.logger.info({ count: dto.favoriteIds.length }, 'reorder');
    await this.reorderFavoritesUseCase.execute(
      new ReorderFavoritesCommand(dto.favoriteIds),
    );
  }
}
