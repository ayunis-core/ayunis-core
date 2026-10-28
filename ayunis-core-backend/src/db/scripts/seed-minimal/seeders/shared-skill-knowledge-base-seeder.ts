import { randomUUID, type UUID } from 'crypto';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { SkillShareRecord } from 'src/domain/shares/infrastructure/postgres/schema/share.record';
import { OrgShareScopeRecord } from 'src/domain/shares/infrastructure/postgres/schema/share-scope.record';
import { log } from 'src/db/scripts/utils/seed-log';
import type {
  OrgFixture,
  SharedSkillKnowledgeBaseFixture,
} from 'src/db/scripts/seed-minimal/seed-types';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import { OrgSeeder } from 'src/db/scripts/seed-minimal/seeders/base-seeder';

export class SharedSkillKnowledgeBaseSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const fixtures = org.sharedSkillKnowledgeBases ?? [];
    if (fixtures.length === 0) return;

    const orgId = ctx.getOrg(org.key).id;
    const ownerId = ctx.getAdmin(org.key).id;
    const scope = await this.seedOrgScope(orgId);

    for (const fixture of fixtures) {
      const skill = await this.findSkill(ownerId, fixture);
      const knowledgeBase = await this.findKnowledgeBase(
        orgId,
        ownerId,
        fixture,
      );
      await this.ensureKnowledgeBaseAssignment(skill, knowledgeBase);
      await this.seedSkillShare(skill, ownerId, scope);
    }
  }

  private async seedOrgScope(orgId: UUID): Promise<OrgShareScopeRecord> {
    return this.findOrCreate(
      this.repo(OrgShareScopeRecord),
      { orgId },
      () => ({ id: randomUUID(), orgId }),
      { entity: 'Organization share scope', name: orgId },
    );
  }

  private async findSkill(
    userId: UUID,
    fixture: SharedSkillKnowledgeBaseFixture,
  ): Promise<SkillRecord> {
    const skill = await this.repo(SkillRecord).findOne({
      where: { userId, name: fixture.skillName },
      relations: ['knowledgeBases'],
    });
    if (!skill) {
      throw new Error(`Seed skill not found: ${fixture.skillName}`);
    }
    return skill;
  }

  private async findKnowledgeBase(
    orgId: UUID,
    userId: UUID,
    fixture: SharedSkillKnowledgeBaseFixture,
  ): Promise<KnowledgeBaseRecord> {
    const knowledgeBase = await this.repo(KnowledgeBaseRecord).findOne({
      where: { orgId, userId, name: fixture.knowledgeBaseName },
    });
    if (!knowledgeBase) {
      throw new Error(
        `Seed knowledge base not found: ${fixture.knowledgeBaseName}`,
      );
    }
    return knowledgeBase;
  }

  private async ensureKnowledgeBaseAssignment(
    skill: SkillRecord,
    knowledgeBase: KnowledgeBaseRecord,
  ): Promise<void> {
    const alreadyAssigned = skill.knowledgeBases?.some(
      ({ id }) => id === knowledgeBase.id,
    );
    if (alreadyAssigned) {
      log('Skill knowledge base assignment', skill.name, false);
      return;
    }

    await this.repo(SkillRecord)
      .createQueryBuilder()
      .relation(SkillRecord, 'knowledgeBases')
      .of(skill.id)
      .add(knowledgeBase.id);
    log('Skill knowledge base assignment', skill.name, true);
  }

  private async seedSkillShare(
    skill: SkillRecord,
    ownerId: UUID,
    scope: OrgShareScopeRecord,
  ): Promise<void> {
    const shares = this.repo(SkillShareRecord);
    const existing = await shares.findOne({
      where: { skillId: skill.id, ownerId },
      relations: ['scope'],
    });
    if (existing) {
      if (existing.scope.id !== scope.id) {
        existing.scope = scope;
        await shares.save(existing);
      }
      log('Skill share', skill.name, false);
      return;
    }

    await shares.save(
      shares.create({
        id: randomUUID(),
        skillId: skill.id,
        ownerId,
        scope,
      }),
    );
    log('Skill share', skill.name, true);
  }
}
