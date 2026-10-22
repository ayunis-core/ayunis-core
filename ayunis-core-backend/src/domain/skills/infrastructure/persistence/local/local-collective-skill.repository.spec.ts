import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { SkillNameTakenAtTargetError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { LocalCollectiveSkillRepository } from './local-collective-skill.repository';
import type { SkillMapper } from './mappers/skill.mapper';
import type { SkillRecord } from './schema/skill.record';

describe('LocalCollectiveSkillRepository.transferFromPersonal', () => {
  const userId = randomUUID();
  const skill = new PersonalSkill({
    name: 'Bauantrag vorprüfen',
    shortDescription: 'Prüft Bauanträge',
    instructions: 'Prüfe die Unterlagen.',
    userId,
  });
  const owner = {
    teamId: randomUUID(),
    orgId: randomUUID(),
    submittedByUserId: userId,
  };
  let update: jest.Mock;
  let execute: jest.Mock;
  let repository: LocalCollectiveSkillRepository;

  beforeEach(() => {
    update = jest.fn();
    execute = jest.fn();
    const queryBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute,
    };
    const manager = {
      getRepository: jest.fn(() => ({ update })),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    repository = new LocalCollectiveSkillRepository(
      {} as Repository<SkillRecord>,
      {} as SkillMapper,
      {
        tx: manager,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  });

  it('moves the skill and drops its integration links', async () => {
    update.mockResolvedValue({ affected: 1 });

    await expect(repository.transferFromPersonal(skill, owner)).resolves.toBe(
      true,
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('reports a skill that no longer belongs to the requester', async () => {
    update.mockResolvedValue({ affected: 0 });

    await expect(repository.transferFromPersonal(skill, owner)).resolves.toBe(
      false,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('reports a name taken at the target by a concurrent handover', async () => {
    update.mockRejectedValue(
      Object.assign(new Error('duplicate key'), {
        driverError: { code: '23505' },
      }),
    );

    await expect(
      repository.transferFromPersonal(skill, owner),
    ).rejects.toBeInstanceOf(SkillNameTakenAtTargetError);
  });
});
