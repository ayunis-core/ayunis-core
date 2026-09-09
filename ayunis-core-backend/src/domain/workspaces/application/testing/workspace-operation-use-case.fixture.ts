import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';

function createMockModule<T>(type: Type<T>) {
  const mocks = new Map<
    unknown,
    {
      execute: jest.Mock;
      requireOwned: jest.Mock;
      executeForAuthorizedSkill: jest.Mock;
    }
  >();
  return Test.createTestingModule({ providers: [type] })
    .useMocker((token) => {
      if (!mocks.has(token))
        mocks.set(token, {
          execute: jest.fn(),
          requireOwned: jest.fn(),
          executeForAuthorizedSkill: jest.fn(),
        });
      return mocks.get(token);
    })
    .compile();
}

export async function workspaceOperationUseCaseFixture<T>(type: Type<T>) {
  const module = await createMockModule(type);
  const workspaceId = randomUUID();
  const skill = new WorkspaceSkill({
    workspaceId,
    name: 'Permit Review',
    shortDescription: 'Review applications',
    instructions: 'Use municipal regulations.',
  });
  const knowledgeBase = new WorkspaceKnowledgeBase({
    workspaceId,
    orgId: randomUUID(),
    name: 'Permit regulations',
    description: 'Municipal regulations',
  });
  return {
    useCase: module.get(type),
    dependency: <D>(dependency: Type<D>): jest.Mocked<D> =>
      module.get(dependency),
    workspaceId,
    skill,
    knowledgeBase,
    skillContext: { skill, isActive: true, isPinned: false },
    knowledgeBaseContext: {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      documentCount: 2,
      isActive: true,
    },
    skillQuery: { workspaceId, skillId: skill.id },
    knowledgeBaseQuery: { workspaceId, knowledgeBaseId: knowledgeBase.id },
    file: {
      data: Buffer.from('Document'),
      name: 'regulations.pdf',
      type: 'application/pdf',
    },
    uploadedFile: {
      path: 'unused-upload.pdf',
      originalname: 'regulations.pdf',
      mimetype: 'application/pdf',
    },
  };
}
