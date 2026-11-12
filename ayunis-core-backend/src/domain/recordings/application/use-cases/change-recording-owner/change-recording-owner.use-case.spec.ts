jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingOwnerChangeNotAllowedError } from 'src/domain/recordings/application/recordings.errors';
import type { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ChangeRecordingOwnerCommand } from './change-recording-owner.command';
import { ChangeRecordingOwnerUseCase } from './change-recording-owner.use-case';

describe(ChangeRecordingOwnerUseCase.name, () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const creatorId = randomUUID();
  const teamId = randomUUID();
  const createdAt = new Date('2026-11-02T09:00:00Z');
  const content = {
    name: 'Bauausschuss',
    orgId,
    createdByUserId: creatorId,
    createdAt,
  };

  function setup(stored: Recording) {
    const repository = {
      findById: jest.fn().mockResolvedValue(stored),
      save: jest.fn((recording: Recording) => Promise.resolve(recording)),
    };
    const access = {
      requireWrite: jest.fn().mockResolvedValue(undefined),
      requireCreate: jest.fn().mockResolvedValue(undefined),
    };
    const context = {
      get: (key: string) =>
        ({
          userId,
          orgId,
          role: UserRole.USER,
          systemRole: SystemRole.CUSTOMER,
        })[key],
    };
    const useCase = new ChangeRecordingOwnerUseCase(
      repository as unknown as RecordingRepository,
      access as unknown as RecordingAccessService,
      context as unknown as ContextService,
    );
    return { useCase, repository, access };
  }

  it('moves a personal recording to a team, keeping its id, creator and creation date', async () => {
    const personal = new PersonalRecording({ ...content, userId });
    const { useCase, repository } = setup(personal);

    await useCase.execute(
      new ChangeRecordingOwnerCommand(personal.id, { type: 'team', teamId }),
    );

    const saved = repository.save.mock.calls[0][0];
    expect(saved).toBeInstanceOf(TeamRecording);
    expect(saved).toMatchObject({
      id: personal.id,
      teamId,
      createdByUserId: creatorId,
      createdAt,
    });
  });

  it('makes a recording moved to personal the mover’s own', async () => {
    const org = new OrgRecording(content);
    const { useCase, repository } = setup(org);

    await useCase.execute(
      new ChangeRecordingOwnerCommand(org.id, { type: 'personal' }),
    );

    const saved = repository.save.mock.calls[0][0];
    expect(saved).toBeInstanceOf(PersonalRecording);
    expect(saved).toMatchObject({ id: org.id, userId });
  });

  it('does not move a recording to an owner the user may not manage', async () => {
    const personal = new PersonalRecording({ ...content, userId });
    const { useCase, repository, access } = setup(personal);
    access.requireCreate.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute(
        new ChangeRecordingOwnerCommand(personal.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not move a recording whose current owner the user may not manage', async () => {
    const team = new TeamRecording({ ...content, teamId });
    const { useCase, repository, access } = setup(team);
    access.requireWrite.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute(
        new ChangeRecordingOwnerCommand(team.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects moving a workspace recording', async () => {
    const workspace = new WorkspaceRecording({
      ...content,
      workspaceId: randomUUID(),
    });
    const { useCase, repository } = setup(workspace);

    await expect(
      useCase.execute(
        new ChangeRecordingOwnerCommand(workspace.id, { type: 'personal' }),
      ),
    ).rejects.toBeInstanceOf(RecordingOwnerChangeNotAllowedError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
