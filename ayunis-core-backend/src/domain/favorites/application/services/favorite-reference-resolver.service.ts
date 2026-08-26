import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { FindWorkspacesByIdsQuery } from 'src/domain/workspaces/application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.query';
import { FindWorkspacesByIdsUseCase } from 'src/domain/workspaces/application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import type { Favorite } from 'src/domain/favorites/domain/favorite.entity';
import type { FavoriteResult } from 'src/domain/favorites/application/use-cases/find-favorites/favorite.result';

@Injectable()
export class FavoriteReferenceResolver {
  constructor(
    @InjectPinoLogger(FavoriteReferenceResolver.name)
    private readonly logger: PinoLogger,
    private readonly findWorkspacesByIdsUseCase: FindWorkspacesByIdsUseCase,
    private readonly findThreadsByIdsUseCase: FindThreadsByIdsUseCase,
  ) {}

  async resolveAll(
    favorites: Favorite[],
    userId: UUID,
  ): Promise<FavoriteResult[]> {
    const [workspaces, threads] = await Promise.all([
      this.findWorkspacesByIdsUseCase.execute(
        new FindWorkspacesByIdsQuery(
          this.referenceIds(favorites, FavoriteReferenceType.Workspace),
        ),
      ),
      this.findThreadsByIdsUseCase.execute(
        new FindThreadsByIdsQuery(
          userId,
          this.referenceIds(favorites, FavoriteReferenceType.Thread),
        ),
      ),
    ]);
    const workspacesById = new Map(
      workspaces.map((workspace) => [workspace.id, workspace]),
    );
    const threadsById = new Map(threads.map((thread) => [thread.id, thread]));

    return favorites.flatMap((favorite) => {
      const result = this.resolve(favorite, workspacesById, threadsById);
      if (!result) {
        this.logger.warn(
          {
            favoriteId: favorite.id,
            referenceType: favorite.referenceType,
            referenceId: favorite.referenceId,
          },
          'Ignoring stale favorite reference',
        );
      }
      return result ? [result] : [];
    });
  }

  async assertAccessible(
    referenceType: FavoriteReferenceType,
    referenceId: UUID,
    userId: UUID,
  ): Promise<void> {
    if (referenceType === FavoriteReferenceType.Workspace) {
      const workspaces = await this.findWorkspacesByIdsUseCase.execute(
        new FindWorkspacesByIdsQuery([referenceId]),
      );
      if (workspaces.length === 0) {
        throw new WorkspaceNotFoundError(referenceId);
      }
      return;
    }
    const threads = await this.findThreadsByIdsUseCase.execute(
      new FindThreadsByIdsQuery(userId, [referenceId]),
    );
    if (threads.length === 0) {
      throw new ThreadNotFoundError(referenceId, userId);
    }
  }

  private referenceIds(
    favorites: Favorite[],
    referenceType: FavoriteReferenceType,
  ): UUID[] {
    return favorites
      .filter((favorite) => favorite.referenceType === referenceType)
      .map((favorite) => favorite.referenceId);
  }

  private resolve(
    favorite: Favorite,
    workspacesById: Map<UUID, Workspace>,
    threadsById: Map<UUID, Thread>,
  ): FavoriteResult | null {
    if (favorite.referenceType === FavoriteReferenceType.Workspace) {
      const workspace = workspacesById.get(favorite.referenceId);
      return workspace
        ? {
            id: favorite.id,
            position: favorite.position,
            referenceType: FavoriteReferenceType.Workspace,
            referenceId: favorite.referenceId,
            name: workspace.name,
            icon: workspace.icon,
            color: workspace.color,
          }
        : null;
    }
    const thread = threadsById.get(favorite.referenceId);
    return thread
      ? {
          id: favorite.id,
          position: favorite.position,
          referenceType: FavoriteReferenceType.Thread,
          referenceId: favorite.referenceId,
          name: thread.title ?? null,
          workspaceId: thread.workspaceId,
        }
      : null;
  }
}
