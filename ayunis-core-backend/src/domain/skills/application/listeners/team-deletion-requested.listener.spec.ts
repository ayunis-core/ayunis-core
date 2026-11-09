import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillSourceCleanupService } from 'src/domain/skills/application/services/skill-source-cleanup.service';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { TeamDeletionRequestedEvent } from 'src/iam/teams/application/events/team-deletion-requested.event';
import { SkillsTeamDeletionRequestedListener } from './team-deletion-requested.listener';

describe(SkillsTeamDeletionRequestedListener.name, () => {
  it('defers cleanup of the sources of the team skills', async () => {
    const teamId = randomUUID();
    const orgId = randomUUID();
    const skill = new TeamSkill({
      name: 'Council minutes',
      shortDescription: 'Drafts minutes.',
      instructions: 'Summarise.',
      teamId,
      sourceIds: [randomUUID()],
    });
    const repository = {
      findAllByTeamId: jest.fn().mockResolvedValue([skill]),
    };
    const sourceCleanup = { deferSourceCleanup: jest.fn() };
    const listener = new SkillsTeamDeletionRequestedListener(
      repository as unknown as SkillRepository,
      sourceCleanup as unknown as SkillSourceCleanupService,
    );
    const event = new TeamDeletionRequestedEvent(teamId, orgId);

    await listener.handle(event);

    expect(repository.findAllByTeamId).toHaveBeenCalledWith(teamId);
    expect(sourceCleanup.deferSourceCleanup).toHaveBeenCalledWith(
      event,
      [skill],
      orgId,
      'team',
    );
  });

  it('never blocks team deletion when resolving sources fails', async () => {
    const listener = new SkillsTeamDeletionRequestedListener(
      {
        findAllByTeamId: jest.fn().mockRejectedValue(new Error('db down')),
      } as unknown as SkillRepository,
      { deferSourceCleanup: jest.fn() } as unknown as SkillSourceCleanupService,
    );

    await expect(
      listener.handle(
        new TeamDeletionRequestedEvent(randomUUID(), randomUUID()),
      ),
    ).resolves.toBeUndefined();
  });
});
