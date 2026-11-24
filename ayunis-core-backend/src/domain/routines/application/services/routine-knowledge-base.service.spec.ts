import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineKnowledgeBaseService } from './routine-knowledge-base.service';

const statutes = new PersonalKnowledgeBase({
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Satzungen',
  orgId: TEST_ORG_ID,
  userId: TEST_USER_ID,
});
const teamMinutes = new TeamKnowledgeBase({
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Protokolle Ordnungsamt',
  orgId: TEST_ORG_ID,
  teamId: '88888888-8888-4888-8888-888888888888',
});

describe('RoutineKnowledgeBaseService', () => {
  const findAccessible = { execute: jest.fn() };
  const findAccessibleByIds = { execute: jest.fn() };
  const service = new RoutineKnowledgeBaseService(
    findAccessible as never,
    findAccessibleByIds as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('adds a personal knowledge base the user can access', async () => {
    findAccessible.execute.mockResolvedValue(statutes);

    await expect(service.assertAddable(statutes.id)).resolves.toBeUndefined();
  });

  it('refuses a team knowledge base like one the user cannot access', async () => {
    findAccessible.execute.mockResolvedValue(teamMinutes);

    await expect(service.assertAddable(teamMinutes.id)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('keeps only the personal knowledge bases the user can still access', async () => {
    findAccessibleByIds.execute.mockResolvedValue([statutes, teamMinutes]);

    await expect(
      service.accessible([statutes.id, teamMinutes.id]),
    ).resolves.toEqual([statutes]);
  });
});
