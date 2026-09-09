import { SKILL_RELATIONS } from './local-skill-relations.repository-helper';
import { updateSkill } from './local-skill-update.repository-helper';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

import {
  SkillRepository,
  type SkillListOptions,
  type WorkspaceSkillState,
} from 'src/domain/skills/application/ports/skill.repository';

import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalSkillKnowledgeBaseIdsFinder } from './local-skill-knowledge-base-ids.finder';
import {
  activateSkill as activateSkillRecord,
  deactivateAllExceptOwner as deactivateAllSkillUsersExceptOwner,
  deactivateSkill as deactivateSkillRecord,
  deactivateUsersNotInSet as deactivateSkillUsersNotInSet,
  getActiveSkillIds as loadActiveSkillIds,
  isSkillActive as loadIsSkillActive,
} from './local-skill-activation.repository-helper';
import {
  getPinnedSkillIds,
  isSkillPinned,
  pinSkill,
  setSkillPinned as updateSkillPinned,
} from './local-skill-pinning.repository-helper';
import {
  activateWorkspaceSkill as activateWorkspaceSkillRecord,
  deactivateWorkspaceSkill as deactivateWorkspaceSkillRecord,
  getWorkspaceSkillStates as loadWorkspaceSkillStates,
  setWorkspaceSkillPinned as updateWorkspaceSkillPinned,
} from './local-workspace-skill-activation.repository-helper';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';

@Injectable()
export class LocalSkillRepository implements SkillRepository {
  private readonly logger = new Logger(LocalSkillRepository.name);

  constructor(
    @InjectRepository(SkillRecord)
    private readonly defaultSkillRepository: Repository<SkillRecord>,
    private readonly skillMapper: SkillMapper,
    private readonly accessiblePageFinder: LocalSkillAccessiblePageFinder,
    private readonly knowledgeBaseIdsFinder: LocalSkillKnowledgeBaseIdsFinder,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private getManager(): EntityManager {
    // Scheduled and background callers can run without an active CLS context.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.defaultSkillRepository.manager;
  }

  private get skillRepository(): Repository<SkillRecord> {
    return this.getManager().getRepository(SkillRecord);
  }

  private get skillActivationRepository(): Repository<SkillActivationRecord> {
    return this.getManager().getRepository(SkillActivationRecord);
  }

  create(skill: PersonalSkill): Promise<PersonalSkill>;
  create(skill: WorkspaceSkill): Promise<WorkspaceSkill>;
  create(skill: Skill): Promise<Skill>;
  async create(skill: Skill): Promise<Skill> {
    this.logger.log({ name: skill.name, id: skill.id }, 'create');

    const repository = this.skillRepository;
    const record = this.skillMapper.toRecord(skill);
    const saved = await repository.save(record);

    for (const [relation, ids] of [
      ['sources', skill.sourceIds],
      ['mcpIntegrations', skill.mcpIntegrationIds],
      ['knowledgeBases', skill.knowledgeBaseIds],
    ] as const) {
      if (ids.length > 0) {
        await repository
          .createQueryBuilder()
          .relation(SkillRecord, relation)
          .of(saved.id)
          .add(ids);
      }
    }

    const withRelations = await repository.findOne({
      where: { id: saved.id },
      relations: [...SKILL_RELATIONS],
    });

    if (!withRelations) {
      throw new Error('Failed to load created skill');
    }

    return skill instanceof PersonalSkill
      ? this.skillMapper.toPersonal(withRelations)
      : this.skillMapper.toWorkspace(withRelations);
  }

  update(skill: PersonalSkill, previous: PersonalSkill): Promise<PersonalSkill>;
  update(
    skill: WorkspaceSkill,
    previous: WorkspaceSkill,
  ): Promise<WorkspaceSkill>;
  update(skill: Skill, previous: Skill): Promise<Skill>;
  async update(skill: Skill, previous: Skill): Promise<Skill> {
    return updateSkill(this.getManager(), this.skillMapper, skill, previous);
  }

  async delete(skillId: UUID): Promise<void> {
    this.logger.log({ skillId }, 'delete');
    const result = await this.skillRepository.delete({ id: skillId });
    if (result.affected === 0) throw new SkillNotFoundError(skillId);
  }

  async findById(id: UUID): Promise<Skill | null> {
    const record = await this.skillRepository.findOne({
      where: { id },
      relations: [...SKILL_RELATIONS],
    });
    return record ? this.skillMapper.toDomain(record) : null;
  }

  async findOne(id: UUID, userId: UUID): Promise<PersonalSkill | null> {
    this.logger.log({ id, userId }, 'findOne');

    const record = await this.skillRepository.findOne({
      where: { id, userId },
      relations: [...SKILL_RELATIONS],
    });

    if (!record) return null;
    return this.skillMapper.toPersonal(record);
  }

  async findAllByOwner(userId: UUID): Promise<PersonalSkill[]> {
    this.logger.log({ userId }, 'findAllByOwner');

    const records = await this.skillRepository.find({
      where: { userId, workspaceId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toPersonal(r));
  }

  async findAllByWorkspaceId(workspaceId: UUID): Promise<WorkspaceSkill[]> {
    this.logger.log({ workspaceId }, 'findAllByWorkspaceId');
    const records = await this.skillRepository.find({
      where: { workspaceId },
      relations: [...SKILL_RELATIONS],
    });
    return records.map((record) => this.skillMapper.toWorkspace(record));
  }

  findPaginatedAccessible(
    userId: UUID,
    workspaceId: undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<PersonalSkill>>;
  findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<WorkspaceSkill>>;
  findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<Skill>>;
  async findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<Skill>> {
    this.logger.log(
      { userId, workspaceId, ...options },
      'findPaginatedAccessible',
    );

    const [records, total] = await this.accessiblePageFinder
      .buildQuery(userId, workspaceId, sharedSkillIds, options)
      .addOrderBy('skill_name_sort', 'ASC')
      .addOrderBy('skill.id', 'ASC')
      .skip(options.offset)
      .take(options.limit)
      .getManyAndCount();

    return new Paginated({
      data: records.map((record) =>
        workspaceId === undefined
          ? this.skillMapper.toPersonal(record)
          : this.skillMapper.toWorkspace(record),
      ),
      limit: options.limit,
      offset: options.offset,
      total,
    });
  }

  async findActiveByOwner(userId: UUID): Promise<PersonalSkill[]> {
    this.logger.log({ userId }, 'findActiveByOwner');

    const activations = await this.skillActivationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    if (activations.length === 0) return [];

    const activeSkillIds = activations.map((a) => a.skillId);
    const records = await this.skillRepository.find({
      where: { id: In(activeSkillIds), userId, workspaceId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toPersonal(r));
  }

  async findByNameAndOwner(
    name: string,
    userId: UUID,
  ): Promise<PersonalSkill | null> {
    this.logger.log({ name, userId }, 'findByNameAndOwner');

    const record = await this.skillRepository.findOne({
      where: { name, userId, workspaceId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });

    if (!record) return null;
    return this.skillMapper.toPersonal(record);
  }

  async findByNameAndWorkspace(
    name: string,
    workspaceId: UUID,
  ): Promise<WorkspaceSkill | null> {
    const record = await this.skillRepository.findOne({
      where: { name, workspaceId },
      relations: [...SKILL_RELATIONS],
    });
    return record ? this.skillMapper.toWorkspace(record) : null;
  }

  async activateSkill(skillId: UUID, userId: UUID): Promise<void> {
    return activateSkillRecord(this.skillActivationRepository, skillId, userId);
  }

  async deactivateSkill(skillId: UUID, userId: UUID): Promise<void> {
    return deactivateSkillRecord(
      this.skillActivationRepository,
      skillId,
      userId,
    );
  }

  async deactivateAllExceptOwner(skillId: UUID, ownerId: UUID): Promise<void> {
    this.logger.log({ skillId, ownerId }, 'deactivateAllExceptOwner');
    return deactivateAllSkillUsersExceptOwner(
      this.skillActivationRepository,
      skillId,
      ownerId,
    );
  }

  async deactivateUsersNotInSet(
    skillId: UUID,
    ownerId: UUID,
    retainUserIds: Set<UUID>,
  ): Promise<void> {
    this.logger.log(
      { skillId, ownerId, retainCount: retainUserIds.size },
      'deactivateUsersNotInSet',
    );
    return deactivateSkillUsersNotInSet(
      this.skillActivationRepository,
      skillId,
      ownerId,
      retainUserIds,
    );
  }

  async isSkillActive(skillId: UUID, userId: UUID): Promise<boolean> {
    return loadIsSkillActive(this.skillActivationRepository, skillId, userId);
  }

  findByIds(ids: UUID[], workspaceId: null): Promise<PersonalSkill[]>;
  findByIds(ids: UUID[], workspaceId: UUID): Promise<WorkspaceSkill[]>;
  findByIds(ids: UUID[], workspaceId?: UUID | null): Promise<Skill[]>;
  async findByIds(ids: UUID[], workspaceId?: UUID | null): Promise<Skill[]> {
    this.logger.log({ count: ids.length }, 'findByIds');

    if (ids.length === 0) return [];

    const records = await this.skillRepository.find({
      where: {
        id: In([...new Set(ids)]),
        ...(workspaceId !== undefined
          ? { workspaceId: workspaceId ?? IsNull() }
          : {}),
      },
      relations: [...SKILL_RELATIONS],
    });

    if (workspaceId === null)
      return records.map((r) => this.skillMapper.toPersonal(r));
    if (workspaceId !== undefined)
      return records.map((r) => this.skillMapper.toWorkspace(r));
    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async getActiveSkillIds(userId: UUID): Promise<Set<UUID>> {
    return loadActiveSkillIds(this.skillActivationRepository, userId);
  }

  async activateWorkspaceSkill(
    skillId: UUID,
    workspaceId: UUID,
  ): Promise<void> {
    return activateWorkspaceSkillRecord(
      this.skillActivationRepository,
      skillId,
      workspaceId,
    );
  }

  async deactivateWorkspaceSkill(
    skillId: UUID,
    workspaceId: UUID,
  ): Promise<void> {
    return deactivateWorkspaceSkillRecord(
      this.skillActivationRepository,
      skillId,
      workspaceId,
    );
  }

  async setWorkspaceSkillPinned(
    skillId: UUID,
    workspaceId: UUID,
    isPinned: boolean,
  ): Promise<void> {
    return updateWorkspaceSkillPinned(
      this.skillActivationRepository,
      skillId,
      workspaceId,
      isPinned,
    );
  }

  async getWorkspaceSkillStates(
    skillIds: UUID[],
    workspaceId: UUID,
  ): Promise<Map<UUID, WorkspaceSkillState>> {
    return loadWorkspaceSkillStates(
      this.skillActivationRepository,
      skillIds,
      workspaceId,
    );
  }

  async pinSkill(skillId: UUID, userId: UUID): Promise<void> {
    return pinSkill(this.skillActivationRepository, skillId, userId);
  }

  async setSkillPinned(
    skillId: UUID,
    userId: UUID,
    isPinned: boolean,
  ): Promise<void> {
    return updateSkillPinned(
      this.skillActivationRepository,
      skillId,
      userId,
      isPinned,
    );
  }

  async isSkillPinned(skillId: UUID, userId: UUID): Promise<boolean> {
    return isSkillPinned(this.skillActivationRepository, skillId, userId);
  }

  async getPinnedSkillIds(userId: UUID): Promise<Set<UUID>> {
    return getPinnedSkillIds(this.skillActivationRepository, userId);
  }

  async findSkillsByKnowledgeBaseAndOwners(
    knowledgeBaseId: UUID,
    ownerIds: UUID[],
  ): Promise<PersonalSkill[]> {
    this.logger.log(
      {
        knowledgeBaseId,
        ownerCount: ownerIds.length,
      },
      'findSkillsByKnowledgeBaseAndOwners',
    );

    if (ownerIds.length === 0) return [];

    const records = await this.skillRepository
      .createQueryBuilder('skill')
      .innerJoin(
        'skill_knowledge_bases',
        'skb',
        'skb."skillsId" = skill.id AND skb."knowledgeBasesId" = :kbId',
        { kbId: knowledgeBaseId },
      )
      .leftJoinAndSelect('skill.sources', 'sources')
      .leftJoinAndSelect('skill.mcpIntegrations', 'mcpIntegrations')
      .leftJoinAndSelect('skill.knowledgeBases', 'knowledgeBases')
      .where('skill.userId IN (:...ownerIds)', { ownerIds })
      .getMany();

    return records.map((r) => this.skillMapper.toPersonal(r));
  }

  async findKnowledgeBaseIdsBySkillIds(skillIds: UUID[]): Promise<UUID[]> {
    this.logger.log(
      { skillCount: skillIds.length },
      'findKnowledgeBaseIdsBySkillIds',
    );
    return this.knowledgeBaseIdsFinder.findKnowledgeBaseIdsBySkillIds(
      skillIds,
      this.getManager(),
    );
  }

  async removeKnowledgeBaseFromSkills(
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void> {
    this.logger.log(
      {
        knowledgeBaseId,
        skillCount: skillIds.length,
      },
      'removeKnowledgeBaseFromSkills',
    );

    if (skillIds.length === 0) return;

    const manager = this.getManager();
    await manager
      .createQueryBuilder()
      .delete()
      .from('skill_knowledge_bases')
      .where('"knowledgeBasesId" = :kbId', { kbId: knowledgeBaseId })
      .andWhere('"skillsId" IN (:...skillIds)', { skillIds })
      .execute();
  }
}
