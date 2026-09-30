import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import {
  DocumentNotInKnowledgeBaseError,
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { SourceReindexNotSupportedError } from 'src/domain/sources/application/sources.errors';
import { SetSourceReindexScheduleUseCase } from 'src/domain/sources/application/use-cases/set-source-reindex-schedule/set-source-reindex-schedule.use-case';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SetDocumentReindexScheduleCommand } from './set-document-reindex-schedule.command';
import { SetDocumentReindexScheduleUseCase } from './set-document-reindex-schedule.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const EVERY_TWO_WEEKS = new ReindexInterval(2, ReindexIntervalUnit.WEEKS);

function wasteCalendar(knowledgeBaseId: UUID): UrlSource {
  return new UrlSource({
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    knowledgeBaseId,
    lastIndexedAt: new Date('2026-09-25T06:00:00.000Z'),
  });
}

async function setup(knowledgeBase: KnowledgeBase) {
  const document = wasteCalendar(knowledgeBase.id);
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    findSourceByIdAndKnowledgeBaseId: jest.fn().mockResolvedValue(document),
  };
  const writeAccess = {
    requireWrite: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseWriteAccessService>;
  const scheduled = wasteCalendar(knowledgeBase.id);
  const setSchedule = { execute: jest.fn().mockResolvedValue(scheduled) };
  const module = await Test.createTestingModule({
    providers: [
      SetDocumentReindexScheduleUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: SetSourceReindexScheduleUseCase, useValue: setSchedule },
    ],
  }).compile();
  return {
    useCase: module.get(SetDocumentReindexScheduleUseCase),
    repository,
    writeAccess,
    setSchedule,
    document,
    scheduled,
  };
}

function command(
  knowledgeBaseId: UUID,
  documentId: UUID,
  reindexInterval: ReindexInterval | null = EVERY_TWO_WEEKS,
): SetDocumentReindexScheduleCommand {
  return new SetDocumentReindexScheduleCommand({
    knowledgeBaseId,
    documentId,
    reindexInterval,
  });
}

describe(SetDocumentReindexScheduleUseCase.name, () => {
  it.each([
    [
      'personal',
      () =>
        new PersonalKnowledgeBase({
          name: 'Stadtverwaltung',
          userId: USER_ID,
          orgId: ORG_ID,
        }),
    ],
    [
      'workspace',
      () =>
        new WorkspaceKnowledgeBase({
          name: 'Bauamt',
          workspaceId: WORKSPACE_ID,
          orgId: ORG_ID,
        }),
    ],
  ])(
    'sets the schedule of a document in an authorized %s knowledge base',
    async (_scope, makeKnowledgeBase) => {
      const knowledgeBase = makeKnowledgeBase();
      const { useCase, writeAccess, setSchedule, document, scheduled } =
        await setup(knowledgeBase);

      await expect(
        useCase.execute(command(knowledgeBase.id, document.id)),
      ).resolves.toBe(scheduled);
      expect(writeAccess.requireWrite).toHaveBeenCalledWith(knowledgeBase);
      expect(setSchedule.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: document.id,
          interval: EVERY_TWO_WEEKS,
        }),
      );
    },
  );

  it('passes a removal through as a null interval', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Stadtverwaltung',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, setSchedule, document } = await setup(knowledgeBase);

    await useCase.execute(command(knowledgeBase.id, document.id, null));

    expect(setSchedule.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: document.id, interval: null }),
    );
  });

  it('does not inspect or schedule a document when write access is denied', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: randomUUID(),
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess, setSchedule, document } =
      await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(command(knowledgeBase.id, document.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(repository.findSourceByIdAndKnowledgeBaseId).not.toHaveBeenCalled();
    expect(setSchedule.execute).not.toHaveBeenCalled();
  });

  it('rejects a document that belongs to another knowledge base', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Stadtverwaltung',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, setSchedule } = await setup(knowledgeBase);
    repository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(null);
    const foreignDocumentId = randomUUID();

    await expect(
      useCase.execute(command(knowledgeBase.id, foreignDocumentId)),
    ).rejects.toBeInstanceOf(DocumentNotInKnowledgeBaseError);
    expect(repository.findSourceByIdAndKnowledgeBaseId).toHaveBeenCalledWith(
      foreignDocumentId,
      knowledgeBase.id,
    );
    expect(setSchedule.execute).not.toHaveBeenCalled();
  });

  it('returns not found without authorizing when the knowledge base does not exist', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Stadtverwaltung',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess, setSchedule, document } =
      await setup(knowledgeBase);
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(command(knowledgeBase.id, document.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(writeAccess.requireWrite).not.toHaveBeenCalled();
    expect(setSchedule.execute).not.toHaveBeenCalled();
  });

  it('passes source errors such as an unsupported source type through', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Stadtverwaltung',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, setSchedule, document } = await setup(knowledgeBase);
    setSchedule.execute.mockRejectedValue(
      new SourceReindexNotSupportedError(document.id),
    );

    await expect(
      useCase.execute(command(knowledgeBase.id, document.id)),
    ).rejects.toBeInstanceOf(SourceReindexNotSupportedError);
  });

  it('wraps unexpected lookup failures', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Stadtverwaltung',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, document } = await setup(knowledgeBase);
    repository.findById.mockRejectedValue(new Error('Connection refused'));

    await expect(
      useCase.execute(command(knowledgeBase.id, document.id)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
