import { randomUUID, type UUID } from 'crypto';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { SetSourceReindexScheduleUseCase } from 'src/domain/sources/application/use-cases/set-source-reindex-schedule/set-source-reindex-schedule.use-case';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  createMockContextService,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { SetDocumentReindexScheduleCommand } from './set-document-reindex-schedule.command';
import { SetDocumentReindexScheduleUseCase } from './set-document-reindex-schedule.use-case';

const ORG_ID = randomUUID();
const OWNER_ID = randomUUID();
const RECIPIENT_ID = randomUUID();
const EVERY_TWO_WEEKS = new ReindexInterval(2, ReindexIntervalUnit.WEEKS);

/**
 * Runs the use case against the real write-access policy and workspace
 * ownership check, so each principal gets the decision production gives it.
 */
function setupAs(
  userId: UUID,
  knowledgeBase: KnowledgeBase,
  workspace?: Workspace,
) {
  const context = createMockContextService({ userId, orgId: ORG_ID });
  const workspaces = createMockWorkspacesRepository();
  workspaces.findById.mockImplementation((requesterId, id) =>
    Promise.resolve(
      workspace?.id === id && workspace.userId === requesterId
        ? workspace
        : null,
    ),
  );
  const writeAccess = new KnowledgeBaseWriteAccessService(
    context,
    new AssertWorkspaceWriteAccessUseCase(
      new WorkspaceAccessService(workspaces, context),
    ),
  );
  const document = new UrlSource({
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    knowledgeBaseId: knowledgeBase.id,
  });
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    findSourceByIdAndKnowledgeBaseId: jest.fn().mockResolvedValue(document),
  } as unknown as KnowledgeBaseRepository;
  const setSchedule = {
    execute: jest.fn().mockResolvedValue(document),
  } as unknown as jest.Mocked<SetSourceReindexScheduleUseCase>;
  const useCase = new SetDocumentReindexScheduleUseCase(
    repository,
    writeAccess,
    setSchedule,
  );
  const schedule = () =>
    useCase.execute(
      new SetDocumentReindexScheduleCommand({
        knowledgeBaseId: knowledgeBase.id,
        documentId: document.id,
        reindexInterval: EVERY_TWO_WEEKS,
      }),
    );
  return { schedule, setSchedule };
}

describe(`${SetDocumentReindexScheduleUseCase.name} access`, () => {
  const personal = new PersonalKnowledgeBase({
    name: 'Stadtverwaltung',
    userId: OWNER_ID,
    orgId: ORG_ID,
  });

  it('denies a recipient of the personal knowledge base, whose share is read-only, and allows its owner', async () => {
    const recipient = setupAs(RECIPIENT_ID, personal);
    await expect(recipient.schedule()).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(recipient.setSchedule.execute).not.toHaveBeenCalled();

    const owner = setupAs(OWNER_ID, personal);
    await expect(owner.schedule()).resolves.toBeInstanceOf(UrlSource);
    expect(owner.setSchedule.execute).toHaveBeenCalledTimes(1);
  });

  it('denies another member of the organization on a workspace knowledge base and allows the workspace owner', async () => {
    const workspace = new Workspace({
      name: 'Bauamt',
      userId: OWNER_ID,
      orgId: ORG_ID,
    });
    const workspaceKnowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Bebauungspläne',
      workspaceId: workspace.id,
      orgId: ORG_ID,
    });

    const member = setupAs(RECIPIENT_ID, workspaceKnowledgeBase, workspace);
    await expect(member.schedule()).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(member.setSchedule.execute).not.toHaveBeenCalled();

    const owner = setupAs(OWNER_ID, workspaceKnowledgeBase, workspace);
    await expect(owner.schedule()).resolves.toBeInstanceOf(UrlSource);
  });

  it('denies the owner of a knowledge base in another organization', async () => {
    const foreign = new PersonalKnowledgeBase({
      name: 'Nachbargemeinde',
      userId: OWNER_ID,
      orgId: randomUUID(),
    });

    const { schedule, setSchedule } = setupAs(OWNER_ID, foreign);

    await expect(schedule()).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(setSchedule.execute).not.toHaveBeenCalled();
  });
});
