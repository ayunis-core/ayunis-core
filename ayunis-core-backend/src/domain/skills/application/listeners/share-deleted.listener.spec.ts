import { Test, TestingModule } from '@nestjs/testing';
import { ShareDeletedListener } from './share-deleted.listener';
import { SkillRepository } from '../ports/skill.repository';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { randomUUID } from 'crypto';

describe('ShareDeletedListener', () => {
  let listener: ShareDeletedListener;
  let skillRepository: { deactivateAllExceptOwner: jest.Mock };

  beforeEach(async () => {
    skillRepository = {
      deactivateAllExceptOwner: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareDeletedListener,
        { provide: SkillRepository, useValue: skillRepository },
      ],
    }).compile();

    listener = module.get<ShareDeletedListener>(ShareDeletedListener);
  });

  it('should deactivate all non-owner activations when a skill share is deleted', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
    );

    await listener.handleShareDeleted(event);

    expect(skillRepository.deactivateAllExceptOwner).toHaveBeenCalledWith(
      skillId,
      ownerId,
    );
  });

  it('should not deactivate anything when an agent share is deleted', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.AGENT,
      randomUUID(),
      randomUUID(),
    );

    await listener.handleShareDeleted(event);

    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
  });

  it('should not deactivate anything when a prompt share is deleted', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.PROMPT,
      randomUUID(),
      randomUUID(),
    );

    await listener.handleShareDeleted(event);

    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
  });
});
