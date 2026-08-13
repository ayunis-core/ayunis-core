import { randomUUID } from 'crypto';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { FavoriteRecord } from 'src/domain/favorites/infrastructure/persistence/local/schema/favorite.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { OrgSeeder } from './base-seeder';
import type { SeedState } from '../seed-state';
import type { OrgFixture } from '../seed-types';

/**
 * Seeds the org's workspaces ("Projekte", AYC-700), owned by the org admin.
 * Chats are deliberately not seeded — creating one in a workspace is two
 * clicks in the UI, while thread/message fixtures would be a project of their
 * own. The rows are invisible until FEATURE_WORKSPACES_ENABLED is on.
 *
 * Sidebar pin state and order are favorites rows, not workspace columns. The
 * app favorites a new workspace inside CreateWorkspaceUseCase; the seeder
 * inserts rows directly, so pinned fixtures get their favorite row explicitly.
 * Positions append after the admin's existing favorites (the favorites table
 * enforces user/position uniqueness) and follow the fixture order.
 */
export class WorkspaceSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const workspaces = org.workspaces ?? [];
    if (workspaces.length === 0) {
      return;
    }

    const orgId = ctx.getOrg(org.key).id;
    const admin = ctx.getAdmin(org.key);
    const favorites = this.repo(FavoriteRecord);

    for (const workspace of workspaces) {
      const record = await this.findOrCreate(
        this.repo(WorkspaceRecord),
        { orgId, userId: admin.id, name: workspace.name },
        () => ({
          id: randomUUID(),
          orgId,
          userId: admin.id,
          name: workspace.name,
          description: workspace.description ?? null,
          icon: workspace.icon,
          color: workspace.color,
        }),
        { entity: 'Workspace', name: workspace.name },
      );

      if (!workspace.pinned) {
        continue;
      }
      const maxPosition = await favorites.maximum('position', {
        userId: admin.id,
      });
      await this.findOrCreate(
        favorites,
        {
          userId: admin.id,
          referenceType: FavoriteReferenceType.Workspace,
          referenceId: record.id,
        },
        () => ({
          id: randomUUID(),
          userId: admin.id,
          referenceType: FavoriteReferenceType.Workspace,
          referenceId: record.id,
          position: (maxPosition ?? -1) + 1,
        }),
        { entity: 'Favorite', name: workspace.name },
      );
    }
  }
}
