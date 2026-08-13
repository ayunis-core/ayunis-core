import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesRepository } from '../../../application/ports/favorites-repository.port';
import { LocalFavoritesRepository } from './local-favorites.repository';
import { FavoriteMapper } from './mappers/favorite.mapper';
import { FavoriteRecord } from './schema/favorite.record';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteRecord])],
  providers: [
    LocalFavoritesRepository,
    FavoriteMapper,
    { provide: FavoritesRepository, useExisting: LocalFavoritesRepository },
  ],
  exports: [FavoritesRepository],
})
export class LocalFavoritesRepositoryModule {}
