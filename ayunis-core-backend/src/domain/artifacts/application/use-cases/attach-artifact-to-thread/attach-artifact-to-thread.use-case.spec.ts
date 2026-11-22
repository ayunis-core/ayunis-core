import { randomUUID, type UUID } from 'crypto';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  ArtifactChatModeMismatchError,
  ArtifactNotFoundError,
  ArtifactOutsideChatScopeError,
} from 'src/domain/artifacts/application/artifacts.errors';
import type { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import type { ArtifactOwner } from 'src/domain/artifacts/domain/artifact-owner';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { AttachArtifactToThreadCommand } from './attach-artifact-to-thread.command';
import { AttachArtifactToThreadUseCase } from './attach-artifact-to-thread.use-case';

const orgId = randomUUID();
const user = randomUUID();
const workspaceId = randomUUID();

function chat(params: { workspaceId?: UUID; isAnonymous?: boolean } = {}) {
  return new Thread({ userId: user, messages: [], ...params });
}

function artifact(owner: ArtifactOwner, isAnonymous = false) {
  return new DocumentArtifact({
    owner,
    creatorId: user,
    title: 'Bauantrag',
    isAnonymous,
  });
}

const personal: ArtifactOwner = { type: 'personal', userId: user };
const workspace: ArtifactOwner = { type: 'workspace', workspaceId };

/**
 * The thread lookup finds only the caller's own chats, the repository only
 * artifacts the caller may read; `linked` is what the guarded write reports.
 */
function setup(
  thread: Thread | null,
  found: DocumentArtifact | null,
  linked = true,
) {
  const links: [UUID, UUID][] = [];
  const repository = {
    findById: jest.fn().mockResolvedValue(found),
    linkToMatchingThread: jest.fn((threadId: UUID, artifactId: UUID) => {
      if (linked) links.push([threadId, artifactId]);
      return Promise.resolve(linked);
    }),
  } as unknown as ArtifactsRepository;
  const findThread = {
    execute: jest.fn(() =>
      thread
        ? Promise.resolve({ thread, isLongChat: false })
        : Promise.reject(new ThreadNotFoundError(randomUUID(), user)),
    ),
  } as unknown as FindThreadUseCase;
  const context = {
    get: jest.fn(getFromUserContext({ userId: user, orgId })),
  } as unknown as ContextService;
  const useCase = new AttachArtifactToThreadUseCase(
    repository,
    context,
    findThread,
  );
  const attach = () =>
    useCase.execute(
      new AttachArtifactToThreadCommand({
        threadId: thread?.id ?? randomUUID(),
        artifactId: found?.id ?? randomUUID(),
      }),
    );
  return { attach, links };
}

describe('AttachArtifactToThreadUseCase', () => {
  it('links a personal artifact to another personal chat of its owner', async () => {
    const thread = chat();
    const pulled = artifact(personal);
    const { attach, links } = setup(thread, pulled);

    await attach();

    expect(links).toEqual([[thread.id, pulled.id]]);
  });

  it('links a workspace artifact to a chat of its workspace', async () => {
    const thread = chat({ workspaceId });
    const pulled = artifact(workspace);
    const { attach, links } = setup(thread, pulled);

    await attach();

    expect(links).toEqual([[thread.id, pulled.id]]);
  });

  it('links an anonymous artifact to an anonymous chat', async () => {
    const thread = chat({ isAnonymous: true });
    const pulled = artifact(personal, true);
    const { attach, links } = setup(thread, pulled);

    await attach();

    expect(links).toEqual([[thread.id, pulled.id]]);
  });

  it('rejects another user’s chat', async () => {
    const { attach, links } = setup(null, artifact(personal));

    await expect(attach()).rejects.toThrow(ThreadNotFoundError);
    expect(links).toEqual([]);
  });

  it('rejects an artifact the caller may not read like a missing one', async () => {
    const { attach, links } = setup(chat(), null);

    await expect(attach()).rejects.toThrow(ArtifactNotFoundError);
    expect(links).toEqual([]);
  });

  it.each([
    ['a workspace artifact to a personal chat', chat(), workspace],
    [
      'a personal artifact to a workspace chat',
      chat({ workspaceId }),
      personal,
    ],
    [
      'an artifact of another workspace',
      chat({ workspaceId: randomUUID() }),
      workspace,
    ],
  ])('rejects attaching %s', async (_, thread, owner) => {
    const { attach, links } = setup(thread, artifact(owner));

    await expect(attach()).rejects.toThrow(ArtifactOutsideChatScopeError);
    expect(links).toEqual([]);
  });

  it.each([
    ['a normal artifact to an anonymous chat', true, false],
    ['an anonymous artifact to a normal chat', false, true],
  ])(
    'rejects attaching %s',
    async (_, isChatAnonymous, isArtifactAnonymous) => {
      const { attach, links } = setup(
        chat({ isAnonymous: isChatAnonymous }),
        artifact(personal, isArtifactAnonymous),
      );

      await expect(attach()).rejects.toThrow(ArtifactChatModeMismatchError);
      expect(links).toEqual([]);
    },
  );

  it('rejects the attachment when the chat moved to another scope before the link was written', async () => {
    const { attach } = setup(chat(), artifact(personal), false);

    await expect(attach()).rejects.toThrow(ArtifactOutsideChatScopeError);
  });
});
