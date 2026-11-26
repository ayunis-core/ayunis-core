import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { UUID } from 'crypto';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { FindWorkspacesByIdsQuery } from 'src/domain/workspaces/application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.query';
import { FindWorkspacesByIdsUseCase } from 'src/domain/workspaces/application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { FindManageableRoutinesUseCase } from 'src/domain/routines/application/use-cases/find-manageable-routines/find-manageable-routines.use-case';
import { RoutineNotFoundError } from 'src/domain/routines/application/routines.errors';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import type { Favorite } from 'src/domain/favorites/domain/favorite.entity';
import type { FavoriteResult } from 'src/domain/favorites/application/use-cases/find-favorites/favorite.result';

interface ResolvedReferences {
  workspaces: Map<UUID, Workspace>;
  threads: Map<UUID, Thread>;
  routines: Map<UUID, Routine>;
}

@Injectable()
export class FavoriteReferenceResolver {
  private readonly logger = new Logger(FavoriteReferenceResolver.name);

  constructor(
    private readonly findWorkspacesByIdsUseCase: FindWorkspacesByIdsUseCase,
    private readonly findThreadsByIdsUseCase: FindThreadsByIdsUseCase,
    private readonly moduleRef: ModuleRef,
  ) {}

  async resolveAll(
    favorites: Favorite[],
    userId: UUID,
  ): Promise<FavoriteResult[]> {
    const references = await this.loadReferences(favorites, userId);

    return favorites.flatMap((favorite) => {
      const result = this.resolve(favorite, references);
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
    switch (referenceType) {
      case FavoriteReferenceType.Workspace:
        return this.assertWorkspaceAccessible(referenceId, userId);
      case FavoriteReferenceType.Thread:
        return this.assertThreadAccessible(referenceId, userId);
      case FavoriteReferenceType.Routine:
        return this.assertRoutineAccessible(referenceId);
    }
  }

  private async assertWorkspaceAccessible(
    workspaceId: UUID,
    userId: UUID,
  ): Promise<void> {
    const workspaces = await this.findWorkspacesByIdsUseCase.execute(
      new FindWorkspacesByIdsQuery(userId, [workspaceId]),
    );
    if (workspaces.length === 0) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
  }

  private async assertThreadAccessible(
    threadId: UUID,
    userId: UUID,
  ): Promise<void> {
    const threads = await this.findThreadsByIdsUseCase.execute(
      new FindThreadsByIdsQuery(userId, [threadId]),
    );
    if (threads.length === 0) {
      throw new ThreadNotFoundError(threadId, userId);
    }
  }

  private async assertRoutineAccessible(routineId: UUID): Promise<void> {
    const routines = await this.findManageableRoutines();
    if (!routines.some((routine) => routine.id === routineId)) {
      throw new RoutineNotFoundError(routineId);
    }
  }

  private async loadReferences(
    favorites: Favorite[],
    userId: UUID,
  ): Promise<ResolvedReferences> {
    const hasRoutines = favorites.some(
      (favorite) => favorite.referenceType === FavoriteReferenceType.Routine,
    );
    const [workspaces, threads, routines] = await Promise.all([
      this.findWorkspacesByIdsUseCase.execute(
        new FindWorkspacesByIdsQuery(
          userId,
          this.referenceIds(favorites, FavoriteReferenceType.Workspace),
        ),
      ),
      this.findThreadsByIdsUseCase.execute(
        new FindThreadsByIdsQuery(
          userId,
          this.referenceIds(favorites, FavoriteReferenceType.Thread),
        ),
      ),
      hasRoutines ? this.findManageableRoutines() : [],
    ]);
    return {
      workspaces: new Map(workspaces.map((item) => [item.id, item])),
      threads: new Map(threads.map((item) => [item.id, item])),
      routines: new Map(routines.map((item) => [item.id, item])),
    };
  }

  // Owner-scoped, and empty while routines are off or the user lacks
  // `manage_routines`, so their routine favorites stay hidden until then.
  // Looked up at call time: the routines module reaches this one through
  // threads, so importing it here would make the modules depend on each other.
  private async findManageableRoutines(): Promise<Routine[]> {
    const useCase = this.moduleRef.get(FindManageableRoutinesUseCase, {
      strict: false,
    });
    return (await useCase.execute()) ?? [];
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
    references: ResolvedReferences,
  ): FavoriteResult | null {
    const base = {
      id: favorite.id,
      position: favorite.position,
      referenceId: favorite.referenceId,
    };
    switch (favorite.referenceType) {
      case FavoriteReferenceType.Workspace: {
        const workspace = references.workspaces.get(favorite.referenceId);
        return workspace
          ? {
              ...base,
              referenceType: FavoriteReferenceType.Workspace,
              name: workspace.name,
              icon: workspace.icon,
              color: workspace.color,
            }
          : null;
      }
      case FavoriteReferenceType.Thread: {
        const thread = references.threads.get(favorite.referenceId);
        return thread
          ? {
              ...base,
              referenceType: FavoriteReferenceType.Thread,
              name: thread.title ?? null,
              workspaceId: thread.workspaceId,
            }
          : null;
      }
      case FavoriteReferenceType.Routine: {
        const routine = references.routines.get(favorite.referenceId);
        return routine
          ? {
              ...base,
              referenceType: FavoriteReferenceType.Routine,
              name: routine.name,
            }
          : null;
      }
    }
  }
}
