import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { type EntityManager, In, IsNull, type Repository } from 'typeorm';
import {
  CollectiveSkillRepository,
  type CollectiveSkillScope,
  type CollectiveSkillState,
} from 'src/domain/skills/application/ports/collective-skill.repository';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { SkillMapper } from './mappers/skill.mapper';
import { SKILL_RELATIONS } from './local-skill-relations.repository-helper';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillRecord } from './schema/skill.record';
import { usableCollectiveSkills } from './local-collective-skill-scope.query';

@Injectable()
export class LocalCollectiveSkillRepository implements CollectiveSkillRepository {
  constructor(
    @InjectRepository(SkillRecord)
    private readonly defaultSkillRepository: Repository<SkillRecord>,
    private readonly skillMapper: SkillMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private get manager(): EntityManager {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.defaultSkillRepository.manager;
  }

  private get skills(): Repository<SkillRecord> {
    return this.manager.getRepository(SkillRecord);
  }

  private get activations(): Repository<SkillActivationRecord> {
    return this.manager.getRepository(SkillActivationRecord);
  }

  async findByNameAndTeam(
    name: string,
    teamId: UUID,
  ): Promise<TeamSkill | null> {
    const record = await this.skills.findOne({
      where: { name, teamId },
      relations: [...SKILL_RELATIONS],
    });
    const skill = record ? this.skillMapper.toDomain(record) : null;
    return skill instanceof TeamSkill ? skill : null;
  }

  async findByNameAndOrg(name: string, orgId: UUID): Promise<OrgSkill | null> {
    const record = await this.skills.findOne({
      where: { name, orgId, teamId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });
    const skill = record ? this.skillMapper.toDomain(record) : null;
    return skill instanceof OrgSkill ? skill : null;
  }

  async findUsable(scope: CollectiveSkillScope): Promise<CollectiveSkill[]> {
    const rows = await this.skills
      .createQueryBuilder('skill')
      .select('skill.id')
      .where(usableCollectiveSkills(scope))
      .getMany();
    return this.loadByIds(rows);
  }

  async findActiveUsable(
    scope: CollectiveSkillScope,
    options: { includeMandatory: boolean },
  ): Promise<CollectiveSkill[]> {
    const active = options.includeMandatory
      ? '(activation.id IS NULL OR activation.isActive = true OR skill.isMandatory = true)'
      : '(activation.id IS NULL OR activation.isActive = true)';
    const rows = await this.skills
      .createQueryBuilder('skill')
      .select('skill.id')
      .leftJoin(
        SkillActivationRecord,
        'activation',
        'activation.skillId = skill.id AND activation.userId = :userId',
        { userId: scope.userId },
      )
      .where(usableCollectiveSkills(scope))
      .andWhere(active)
      .getMany();
    return this.loadByIds(rows);
  }

  async setMandatory(skillId: UUID, isMandatory: boolean): Promise<void> {
    await this.skills.update({ id: skillId }, { isMandatory });
  }

  async getStates(
    skillIds: UUID[],
    userId: UUID,
  ): Promise<Map<UUID, CollectiveSkillState>> {
    const states = new Map<UUID, CollectiveSkillState>(
      skillIds.map((id) => [id, { isActive: true, isPinned: false }]),
    );
    if (skillIds.length === 0) return states;
    const rows = await this.activations.find({
      where: { skillId: In(skillIds), userId },
    });
    for (const row of rows) {
      states.set(row.skillId, {
        isActive: row.isActive,
        isPinned: row.isActive && row.isPinned,
      });
    }
    return states;
  }

  async setActive(
    skillId: UUID,
    userId: UUID,
    isActive: boolean,
  ): Promise<void> {
    const changes = isActive ? { isActive } : { isActive, isPinned: false };
    const result = await this.activations.update({ skillId, userId }, changes);
    if (isActive || result.affected) return;
    await this.insertState(skillId, userId, { isActive, isPinned: false });
  }

  async setPinned(
    skillId: UUID,
    userId: UUID,
    isPinned: boolean,
  ): Promise<void> {
    const changes = isPinned ? { isPinned, isActive: true } : { isPinned };
    const result = await this.activations.update({ skillId, userId }, changes);
    if (!isPinned || result.affected) return;
    await this.insertState(skillId, userId, { isActive: true, isPinned });
  }

  async transferFromPersonal(
    skillId: UUID,
    owner: { teamId: UUID | null; orgId: UUID; submittedByUserId: UUID },
  ): Promise<boolean> {
    const result = await this.skills.update(
      { id: skillId, userId: owner.submittedByUserId },
      {
        userId: null,
        teamId: owner.teamId,
        orgId: owner.orgId,
        submittedByUserId: owner.submittedByUserId,
      },
    );
    if (!result.affected) return false;
    await this.manager
      .createQueryBuilder()
      .delete()
      .from('skill_knowledge_bases')
      .where('"skillsId" = :skillId', { skillId })
      .execute();
    await this.manager
      .createQueryBuilder()
      .delete()
      .from('skill_mcp_integrations')
      .where('"skillsId" = :skillId', { skillId })
      .execute();
    return true;
  }

  private async insertState(
    skillId: UUID,
    userId: UUID,
    state: CollectiveSkillState,
  ): Promise<void> {
    await this.activations
      .createQueryBuilder()
      .insert()
      .into(SkillActivationRecord)
      .values({ id: randomUUID(), skillId, userId, ...state })
      .orIgnore()
      .execute();
  }

  private async loadByIds(
    rows: Pick<SkillRecord, 'id'>[],
  ): Promise<CollectiveSkill[]> {
    if (rows.length === 0) return [];
    const records = await this.skills.find({
      where: { id: In(rows.map(({ id }) => id)) },
      relations: [...SKILL_RELATIONS],
    });
    return records
      .map((record) => this.skillMapper.toDomain(record))
      .filter(
        (skill): skill is CollectiveSkill =>
          skill instanceof TeamSkill || skill instanceof OrgSkill,
      );
  }
}
