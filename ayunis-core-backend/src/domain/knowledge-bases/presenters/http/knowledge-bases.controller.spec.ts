import { BadRequestException } from '@nestjs/common';
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
import { KnowledgeBasesController } from './knowledge-bases.controller';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

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
});
