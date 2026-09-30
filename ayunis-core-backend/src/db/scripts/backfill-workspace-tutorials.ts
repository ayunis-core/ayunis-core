/**
 * One-time backfill: provisions the workspace tutorial for every existing user
 * through the same service the signup listener uses. Safe to re-run; users who
 * already own a tutorial workspace are skipped.
 *
 *   pnpm backfill:workspace-tutorials:ts [--org-id <uuid>]
 */
import 'src/config/env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { DataSource } from 'typeorm';
import type { UUID } from 'crypto';
import { AppModule } from 'src/app/app.module';
import { featuresConfig } from 'src/config/features.config';
import { installNestLogger } from 'src/common/logger/install-nest-logger';
import { WorkspaceTutorialProvisioningService } from 'src/domain/workspaces/application/services/workspace-tutorial-provisioning.service';
import { WORKSPACE_TUTORIAL_NAME } from 'src/domain/workspaces/domain/workspaces.constants';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

const logger = new Logger('WorkspaceTutorialBackfill');

async function run(orgId?: UUID): Promise<void> {
  if (!featuresConfig().workspacesEnabled)
    throw new Error('FEATURE_WORKSPACES_ENABLED must be true');
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  installNestLogger(app);
  try {
    const dataSource = app.get(DataSource);
    const provisioning = app.get(WorkspaceTutorialProvisioningService);
    const workspaces = dataSource.getRepository(WorkspaceRecord);
    const users = await dataSource.getRepository(UserRecord).find({
      select: { id: true, orgId: true },
      where: orgId ? { orgId } : {},
    });
    const counts = { provisioned: 0, skipped: 0, failed: 0 };
    for (const user of users) {
      const where = { userId: user.id, name: WORKSPACE_TUTORIAL_NAME };
      if (await workspaces.exists({ where })) {
        counts.skipped += 1;
        continue;
      }
      try {
        await provisioning.provisionFor(user.id, user.orgId);
        counts.provisioned += 1;
      } catch (error) {
        counts.failed += 1;
        logger.error({ userId: user.id, err: error }, 'Provisioning failed');
      }
    }
    logger.log(counts, 'Workspace tutorial backfill finished');
    if (counts.failed) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

const { values } = parseArgs({ options: { 'org-id': { type: 'string' } } });
run(values['org-id'] as UUID | undefined).catch((error: unknown) => {
  logger.error({ err: error }, 'Workspace tutorial backfill aborted');
  process.exitCode = 1;
});
