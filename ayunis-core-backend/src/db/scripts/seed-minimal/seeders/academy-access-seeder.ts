import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { OrgAddonRecord } from 'src/iam/addons/infrastructure/persistence/postgres/schema/org-addon.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyCompletionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-completion.record';
import { AcademyChapterConfirmationRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-chapter-confirmation.record';
import { OrgSeeder } from './base-seeder';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import type {
  AcademyCompletionFixture,
  OrgFixture,
} from 'src/db/scripts/seed-minimal/seed-types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The academy add-on plus a spread of completion dates covering every
 * Academy completion state the UI can show.
 *
 * Offsets are relative to seed time, so the same fixture keeps producing valid /
 * expiring-soon / expired rows however long after it was written — that is what
 * makes the admin overview and the expiry notifications testable without
 * hand-editing timestamps in SQL.
 */
export class AcademyAccessSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    if (!org.academyAddon) {
      return;
    }

    const orgId = ctx.getOrg(org.key).id;
    await this.seedAddon(orgId);

    // The org's requirement mode is left unset (an absent row means
    // unrestricted) because switching it is itself a step under test.
    for (const completion of org.academyCompletions ?? []) {
      await this.seedCompletion(ctx, completion);
    }
  }

  private async seedAddon(orgId: UUID): Promise<void> {
    await this.findOrCreate(
      this.repo(OrgAddonRecord),
      { orgId, type: AddonType.AYUNIS_CORE_ACADEMY },
      () => ({
        id: randomUUID(),
        orgId,
        type: AddonType.AYUNIS_CORE_ACADEMY,
      }),
      { entity: 'Addon', name: `academy for org ${orgId}` },
    );
  }

  private async seedCompletion(
    ctx: SeedState,
    fixture: AcademyCompletionFixture,
  ): Promise<void> {
    const user = await this.repo(UserRecord).findOne({
      where: { email: fixture.email },
    });
    if (!user) {
      return;
    }

    const completedAt = new Date(
      Date.now() - fixture.completedDaysAgo * DAY_MS,
    );

    await this.findOrCreate(
      this.repo(AcademyCompletionRecord),
      { userId: user.id },
      () => ({ id: randomUUID(), userId: user.id, completedAt }),
      {
        entity: 'Academy completion',
        name: `${fixture.email} — ${fixture.expectedState}`,
      },
    );

    // Keep chapter confirmations aligned with seeded whole-academy completion.
    for (const chapter of ctx.getAcademyChapters()) {
      await this.findOrCreate(
        this.repo(AcademyChapterConfirmationRecord),
        { userId: user.id, chapterId: chapter.id },
        () => ({
          id: randomUUID(),
          userId: user.id,
          chapterId: chapter.id,
          confirmedAt: completedAt,
        }),
        {
          entity: 'Academy confirmation',
          name: `${fixture.email} — ${chapter.title}`,
        },
      );
    }
  }
}
