import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import type { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import type { Favorite } from 'src/domain/favorites/domain/favorite.entity';
import { FavoritesRepository } from 'src/domain/favorites/application/ports/favorites-repository.port';
import { FavoriteMapper } from './mappers/favorite.mapper';
import { FavoriteRecord } from './schema/favorite.record';

const PG_UNIQUE_VIOLATION = '23505';
const MAX_APPEND_ATTEMPTS = 3;

function isUniqueViolation(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false;
  const { code, driverError } = error as {
    code?: unknown;
    driverError?: { code?: unknown };
  };
  return (
    code === PG_UNIQUE_VIOLATION || driverError?.code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class LocalFavoritesRepository extends FavoritesRepository {
  constructor(
    @InjectRepository(FavoriteRecord)
    private readonly favorites: Repository<FavoriteRecord>,
    private readonly mapper: FavoriteMapper,
  ) {
    super();
  }

  async findAllByUserId(userId: UUID): Promise<Favorite[]> {
    const records = await this.favorites.find({
      where: { userId },
      order: { position: 'ASC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  // The position is computed inside the INSERT so no read-then-write gap
  // exists, and a duplicate reference no-ops via ON CONFLICT. Two concurrent
  // appends can still resolve the same position; that surfaces as a
  // user/position unique violation and is retried. The parameter casts are
  // required: $2 appears in both the select list and the WHERE clause, and
  // Postgres otherwise fails to deduce a single type for it.
  async append(
    userId: UUID,
    referenceType: FavoriteReferenceType,
    referenceId: UUID,
  ): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.favorites.manager.query(
          `INSERT INTO "favorites" ("id", "userId", "referenceType", "referenceId", "position")
           SELECT $1::character varying, $2::character varying, $3::"public"."favorites_referencetype_enum", $4::character varying,
                  COALESCE(MAX("position"), -1) + 1
           FROM "favorites" WHERE "userId" = $2::character varying
           ON CONFLICT ("userId", "referenceType", "referenceId") DO NOTHING`,
          [randomUUID(), userId, referenceType, referenceId],
        );
        return;
      } catch (error) {
        if (!isUniqueViolation(error) || attempt >= MAX_APPEND_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  async remove(favorite: Favorite): Promise<void> {
    await this.favorites.delete({ id: favorite.id, userId: favorite.userId });
  }

  async removeByReference(
    referenceType: FavoriteReferenceType,
    referenceId: UUID,
  ): Promise<void> {
    await this.favorites.delete({ referenceType, referenceId });
  }

  async reorder(userId: UUID, favoriteIds: UUID[]): Promise<void> {
    if (favoriteIds.length === 0) return;
    await this.favorites.manager.transaction(async (manager) => {
      const [{ maxPosition }] = await manager.query<
        Array<{ maxPosition: number }>
      >(
        `SELECT COALESCE(MAX("position"), -1)::int AS "maxPosition"
         FROM "favorites" WHERE "userId" = $1`,
        [userId],
      );
      await manager.query(
        `UPDATE "favorites" SET "position" = "position" + $1
         WHERE "userId" = $2`,
        [maxPosition + 1, userId],
      );
      await manager.query(
        `UPDATE "favorites" favorite
         SET "position" = ordered."position" - 1
         FROM unnest($1::character varying[]) WITH ORDINALITY
           AS ordered("id", "position")
         WHERE favorite."userId" = $2 AND favorite."id" = ordered."id"`,
        [favoriteIds, userId],
      );
    });
  }
}
