import { Injectable } from '@nestjs/common';
import { Favorite } from 'src/domain/favorites/domain/favorite.entity';
import { FavoriteRecord } from '../schema/favorite.record';

@Injectable()
export class FavoriteMapper {
  toDomain(record: FavoriteRecord): Favorite {
    return new Favorite({
      id: record.id,
      userId: record.userId,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      position: record.position,
    });
  }
}
