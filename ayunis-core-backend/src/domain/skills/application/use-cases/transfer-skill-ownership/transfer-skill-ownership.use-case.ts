import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNameLookupService } from 'src/domain/skills/application/services/skill-name-lookup.service';
import {
  SkillNameTakenAtTargetError,
  SkillNotFoundError,
  SkillOwnerChangedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { TransferSkillOwnershipCommand } from './transfer-skill-ownership.command';

@Injectable()
export class TransferSkillOwnershipUseCase {
  private readonly logger = new Logger(TransferSkillOwnershipUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly names: SkillNameLookupService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: TransferSkillOwnershipCommand): Promise<void> {
    this.logger.log(
      { skillId: command.skillId, target: command.target.type },
      'Transferring skill ownership',
    );
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    if (
      !(skill instanceof PersonalSkill) ||
      skill.userId !== command.requesterId
    ) {
      throw new SkillOwnerChangedError(command.skillId);
    }
    const transferred = this.toCollective(skill, command);
    const taken = await this.names.findSameOwnerByName(transferred, skill.name);
    if (taken) throw new SkillNameTakenAtTargetError(skill.name);
    const wasActive = await this.repository.isSkillActive(
      skill.id,
      command.requesterId,
    );
    const moved = await this.collectiveRepository.transferFromPersonal(
      skill.id,
      {
        teamId: command.target.type === 'team' ? command.target.teamId : null,
        orgId: command.orgId,
        submittedByUserId: command.requesterId,
      },
    );
    if (!moved) throw new SkillOwnerChangedError(command.skillId);
    if (!wasActive) {
      await this.collectiveRepository.setActive(
        skill.id,
        command.requesterId,
        false,
      );
    }
  }

  private toCollective(
    skill: PersonalSkill,
    command: TransferSkillOwnershipCommand,
  ): CollectiveSkill {
    const params = {
      id: skill.id,
      name: skill.name,
      shortDescription: skill.shortDescription,
      instructions: skill.instructions,
      orgId: command.orgId,
      submittedByUserId: command.requesterId,
    };
    return command.target.type === 'team'
      ? new TeamSkill({ ...params, teamId: command.target.teamId })
      : new OrgSkill(params);
  }
}
