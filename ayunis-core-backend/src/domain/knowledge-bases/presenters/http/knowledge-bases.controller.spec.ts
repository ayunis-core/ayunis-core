import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { UploadedDocument } from 'src/common/http/document-upload';
import { CreateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { FindKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { ListKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.use-case';
import { ListKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-knowledge-bases/list-knowledge-bases.use-case';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { KnowledgeBaseDtoMapper } from 'src/domain/knowledge-bases/presenters/http/mappers/knowledge-base-dto.mapper';
import { AddUrlToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { SetDocumentReindexScheduleUseCase } from 'src/domain/knowledge-bases/application/use-cases/set-document-reindex-schedule/set-document-reindex-schedule.use-case';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { REQUIRE_PERMISSION_KEY } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { KnowledgeBasesController } from './knowledge-bases.controller';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const KNOWLEDGE_BASE_ID = '44444444-4444-4444-4444-444444444444' as UUID;

function wasteCalendar(): UrlSource {
  return new UrlSource({
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    lastIndexedAt: new Date('2026-09-25T06:00:00.000Z'),
  });
}

/** Runs the body through the global pipe's options with the method's declared DTO. */
async function validateBody(
  method: keyof KnowledgeBasesController,
  body: object,
) {
  const paramTypes: unknown[] = Reflect.getMetadata(
    'design:paramtypes',
    KnowledgeBasesController.prototype,
    method,
  );
  const metatype = paramTypes.at(-1) as new () => object;
  return new ValidationPipe({ whitelist: true, transform: true }).transform(
    body,
    { type: 'body', metatype },
  );
}

async function setup() {
  const mocks = new Map<unknown, { execute: jest.Mock }>();
  const module = await Test.createTestingModule({
    controllers: [KnowledgeBasesController],
    providers: [KnowledgeBaseDtoMapper],
  })
    .useMocker((token) => {
      const mock = { execute: jest.fn() };
      mocks.set(token, mock);
      return mock;
    })
    .compile();
  return {
    controller: module.get(KnowledgeBasesController),
    useCase: <T>(token: new (...args: never[]) => T) =>
      mocks.get(token) as unknown as jest.Mocked<Pick<T, 'execute' & keyof T>>,
  };
}

describe(KnowledgeBasesController.name, () => {
  it('maps a workspace create request to the canonical owner command', async () => {
    const { controller, useCase } = await setup();
    const create = useCase(CreateKnowledgeBaseUseCase);
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    create.execute.mockResolvedValue(knowledgeBase);

    const result = await (
      controller.create as unknown as (dto: object) => Promise<object>
    )({
      ownerType: 'workspace',
      workspaceId: WORKSPACE_ID,
      name: knowledgeBase.name,
      description: 'Project-specific rules.',
    });

    expect(create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { type: 'workspace', workspaceId: WORKSPACE_ID },
        name: knowledgeBase.name,
      }),
    );
    expect(result).toMatchObject({
      ownerType: 'workspace',
      workspaceId: WORKSPACE_ID,
      documentCount: 0,
      isActive: true,
    });
  });

  it('returns canonical paginated list data with persisted scope and counts', async () => {
    const { controller, useCase } = await setup();
    const list = useCase(ListKnowledgeBasesUseCase);
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    list.execute.mockResolvedValue(
      new Paginated({
        data: [
          {
            knowledgeBase,
            isShared: false,
            isActive: true,
            documentCount: 2,
          },
        ],
        limit: 1,
        offset: 0,
        total: 1,
      }),
    );

    const result = await (
      controller.findAll as unknown as (
        dto: object,
      ) => Promise<{ data: object[]; pagination: object }>
    )({
      ownerType: 'personal',
    });

    expect(list.execute).toHaveBeenCalledWith(
      expect.objectContaining({ owner: { type: 'personal' } }),
    );
    expect(result).toMatchObject({
      data: [
        {
          id: knowledgeBase.id,
          ownerType: 'personal',
          documentCount: 2,
          isShared: false,
          isActive: true,
        },
      ],
      pagination: { limit: 1, offset: 0, total: 1 },
    });
  });

  it('uses the canonical find use case for entity details', async () => {
    const { controller, useCase } = await setup();
    const find = useCase(FindKnowledgeBaseUseCase);
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    find.execute.mockResolvedValue({
      knowledgeBase,
      isShared: false,
      isActive: false,
      documentCount: 4,
    });

    await expect(controller.findOne(knowledgeBase.id)).resolves.toMatchObject({
      ownerType: 'workspace',
      workspaceId: WORKSPACE_ID,
      documentCount: 4,
      isActive: false,
    });
    expect(find.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: knowledgeBase.id }),
    );
  });

  it('lists documents without controller-level access orchestration', async () => {
    const { controller, useCase } = await setup();
    const listDocuments = useCase(ListKnowledgeBaseDocumentsUseCase);
    listDocuments.execute.mockResolvedValue([]);

    await expect(
      (controller.listDocuments as unknown as (id: UUID) => Promise<object>)(
        WORKSPACE_ID,
      ),
    ).resolves.toEqual({ data: [] });
    expect(listDocuments.execute).toHaveBeenCalledWith(
      expect.objectContaining({ knowledgeBaseId: WORKSPACE_ID }),
    );
  });

  it('cleans up an uploaded file when MIME validation rejects it', async () => {
    const { controller } = await setup();
    const knowledgeBaseId: UUID = '223e4567-e89b-12d3-a456-426614174001';
    const file: UploadedDocument = {
      fieldname: 'file',
      originalname: 'unsupported.exe',
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      size: 128,
      path: path.join(process.cwd(), 'uploads', 'unsupported-upload.exe'),
    };
    const unlink = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

    await expect(controller.addDocument(knowledgeBaseId, file)).rejects.toThrow(
      BadRequestException,
    );
    expect(unlink).toHaveBeenCalledWith(file.path);
    unlink.mockRestore();
  });

  it('passes the add-url re-index interval to the use case as a domain interval', async () => {
    const { controller, useCase } = await setup();
    const addUrl = useCase(AddUrlToKnowledgeBaseUseCase);
    addUrl.execute.mockResolvedValue(wasteCalendar());

    await controller.addUrl(
      KNOWLEDGE_BASE_ID,
      await validateBody('addUrl', {
        url: 'https://www.stadt.example/abfall',
        reindexInterval: { value: 2, unit: 'weeks' },
      }),
    );

    expect(addUrl.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        reindexInterval: new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
      }),
    );
  });

  it('adds an unscheduled URL when no interval is sent', async () => {
    const { controller, useCase } = await setup();
    const addUrl = useCase(AddUrlToKnowledgeBaseUseCase);
    addUrl.execute.mockResolvedValue(wasteCalendar());

    await controller.addUrl(
      KNOWLEDGE_BASE_ID,
      await validateBody('addUrl', { url: 'https://www.stadt.example/abfall' }),
    );

    expect(addUrl.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reindexInterval: null }),
    );
  });

  it.each([
    ['a missing interval property', {}],
    [
      'an out-of-range interval',
      { reindexInterval: { value: 13, unit: 'months' } },
    ],
    ['an unknown unit', { reindexInterval: { value: 2, unit: 'days' } }],
  ])('rejects %s on the schedule endpoint', async (_case, body) => {
    await expect(
      validateBody('setDocumentReindexSchedule', body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an out-of-range add-url interval', async () => {
    await expect(
      validateBody('addUrl', {
        url: 'https://www.stadt.example/abfall',
        reindexInterval: { value: 0, unit: 'weeks' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps a schedule request to the document command and returns the scheduled document', async () => {
    const { controller, useCase } = await setup();
    const setSchedule = useCase(SetDocumentReindexScheduleUseCase);
    const scheduled = wasteCalendar();
    scheduled.scheduleReindex(
      new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
      new Date(),
    );
    setSchedule.execute.mockResolvedValue(scheduled);

    const result = await controller.setDocumentReindexSchedule(
      KNOWLEDGE_BASE_ID,
      scheduled.id,
      await validateBody('setDocumentReindexSchedule', {
        reindexInterval: { value: 2, unit: 'weeks' },
      }),
    );

    expect(setSchedule.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        documentId: scheduled.id,
        reindexInterval: new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
      }),
    );
    expect(result).toMatchObject({
      id: scheduled.id,
      reindexInterval: { value: 2, unit: 'weeks' },
      nextReindexAt: '2026-10-09T06:00:00.000Z',
    });
  });

  it('maps a null schedule to a removal', async () => {
    const { controller, useCase } = await setup();
    const setSchedule = useCase(SetDocumentReindexScheduleUseCase);
    const document = wasteCalendar();
    setSchedule.execute.mockResolvedValue(document);

    await controller.setDocumentReindexSchedule(
      KNOWLEDGE_BASE_ID,
      document.id,
      await validateBody('setDocumentReindexSchedule', {
        reindexInterval: null,
      }),
    );

    expect(setSchedule.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reindexInterval: null }),
    );
  });

  it.each(['addUrl', 'setDocumentReindexSchedule'] as const)(
    'requires the knowledge-base management permission for %s',
    (method) => {
      expect(
        Reflect.getMetadata(
          REQUIRE_PERMISSION_KEY,
          KnowledgeBasesController.prototype[method],
        ),
      ).toEqual([Permission.MANAGE_KNOWLEDGE_BASES]);
    },
  );
});
