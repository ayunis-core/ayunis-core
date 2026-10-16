import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  SkillNotOrgOwnedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { SetSkillMandatoryCommand } from './set-skill-mandatory.command';

@Injectable()
export class SetSkillMandatoryUseCase {
  private readonly logger = new Logger(SetSkillMandatoryUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: SetSkillMandatoryCommand): Promise<OrgSkill> {
    this.logger.log(command, 'Setting skill mandatory');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireView(skill);
    if (!(skill instanceof OrgSkill)) {
      throw new SkillNotOrgOwnedError(skill.id);
    }
    await this.authorization.requireManage(skill);
    if (skill.isMandatory === command.isMandatory) return skill;
    await this.collectiveRepository.setMandatory(skill.id, command.isMandatory);
    return skill.withMandatory(command.isMandatory);
  }
}
