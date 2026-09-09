import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import {
  InvalidSkillNameError,
  type SkillParams,
} from 'src/domain/skills/domain/abstract-skill.entity';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  SkillRepository,
  type WorkspaceSkillState,
} from 'src/domain/skills/application/ports/skill.repository';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  SkillNotFoundError,
} from 'src/domain/skills/application/skills.errors';

@Injectable()
export class WorkspaceSkillService {
  constructor(private readonly skillRepository: SkillRepository) {}

  findByIds(workspaceId: UUID, skillIds: UUID[]): Promise<WorkspaceSkill[]> {
    return this.skillRepository.findByIds(skillIds, workspaceId);
  }

  async findOne(workspaceId: UUID, skillId: UUID): Promise<WorkspaceSkill> {
    const skill = (
      await this.skillRepository.findByIds([skillId], workspaceId)
    ).at(0);
    if (
      !(skill instanceof WorkspaceSkill) ||
      skill.workspaceId !== workspaceId
    ) {
      throw new SkillNotFoundError(skillId);
    }
    return skill;
  }

  async updateProperties(
    workspaceId: UUID,
    skillId: UUID,
    values: Pick<WorkspaceSkill, 'name' | 'shortDescription' | 'instructions'>,
  ): Promise<WorkspaceSkill> {
    const skill = await this.findOne(workspaceId, skillId);
    if (values.name !== skill.name) {
      const duplicate = await this.skillRepository.findByNameAndWorkspace(
        values.name,
        workspaceId,
      );
      if (duplicate && duplicate.id !== skill.id) {
        throw new DuplicateSkillNameError(values.name);
      }
    }
    try {
      return await this.save(skill, values);
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }

  async setActive(
    workspaceId: UUID,
    skillId: UUID,
    isActive: boolean,
  ): Promise<WorkspaceSkill> {
    const skill = await this.findOne(workspaceId, skillId);
    if (isActive) {
      await this.skillRepository.activateWorkspaceSkill(skillId, workspaceId);
    } else {
      await this.skillRepository.deactivateWorkspaceSkill(skillId, workspaceId);
    }
    return skill;
  }

  async setPinned(
    workspaceId: UUID,
    skillId: UUID,
    isPinned: boolean,
  ): Promise<WorkspaceSkill> {
    const skill = await this.findOne(workspaceId, skillId);
    const state = await this.getState(workspaceId, skillId);
    if (isPinned && !state.isActive) {
      throw new SkillInvalidInputError(
        'An inactive workspace skill cannot be pinned.',
      );
    }
    await this.skillRepository.setWorkspaceSkillPinned(
      skillId,
      workspaceId,
      isPinned,
    );
    return skill;
  }

  async getState(
    workspaceId: UUID,
    skillId: UUID,
  ): Promise<WorkspaceSkillState> {
    const states = await this.getStates(workspaceId, [skillId]);
    return states.get(skillId) ?? { isActive: false, isPinned: false };
  }

  getStates(
    workspaceId: UUID,
    skillIds: UUID[],
  ): Promise<Map<UUID, WorkspaceSkillState>> {
    return this.skillRepository.getWorkspaceSkillStates(skillIds, workspaceId);
  }

  async setKnowledgeBaseAssigned(
    workspaceId: UUID,
    skillId: UUID,
    knowledgeBaseId: UUID,
    assigned: boolean,
  ): Promise<WorkspaceSkill> {
    const skill = await this.findOne(workspaceId, skillId);
    const ids = new Set(skill.knowledgeBaseIds);
    if (assigned) ids.add(knowledgeBaseId);
    else ids.delete(knowledgeBaseId);
    return this.save(skill, { knowledgeBaseIds: [...ids] });
  }

  private save(
    skill: WorkspaceSkill,
    values: Partial<SkillParams>,
  ): Promise<WorkspaceSkill> {
    return this.skillRepository.update(
      skill.withUpdates({ ...values, updatedAt: new Date() }),
      skill,
    );
  }
}
