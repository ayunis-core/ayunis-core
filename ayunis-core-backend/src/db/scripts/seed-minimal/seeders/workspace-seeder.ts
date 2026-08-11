import { randomUUID } from 'crypto';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { WorkspaceUserSettingsRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-user-settings.record';
import { OrgSeeder } from './base-seeder';
import type { SeedState } from '../seed-state';
import type { OrgFixture } from '../seed-types';

/**
 * Seeds the org's workspaces ("Projekte", AYC-700), owned by the org admin.
 * Chats are deliberately not seeded — creating one in a workspace is two
 * clicks in the UI, while thread/message fixtures would be a project of their
 * own. The rows are invisible until FEATURE_WORKSPACES_ENABLED is on.
 */
export class WorkspaceSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const workspaces = org.workspaces ?? [];
    if (workspaces.length === 0) {
      return;
    }

    const orgId = ctx.getOrg(org.key).id;
    const admin = ctx.getAdmin(org.key);

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

      // Pin state and manual order are per-user rows, owned by the admin here.
      await this.findOrCreate(
        this.repo(WorkspaceUserSettingsRecord),
        { workspaceId: record.id, userId: admin.id },
        () => ({
          id: randomUUID(),
          workspaceId: record.id,
          userId: admin.id,
          isPinned: workspace.isPinned,
          sortOrder: workspace.sortOrder,
        }),
        { entity: 'Workspace settings', name: workspace.name },
      );
    }
  }
}
