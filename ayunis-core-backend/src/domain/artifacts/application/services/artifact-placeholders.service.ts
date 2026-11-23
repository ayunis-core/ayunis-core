import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import {
  createPiiTokenTranslator,
  findReferencedMasks,
} from 'src/common/anonymization/domain/translate-pii-tokens';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactMaskAllocationLock } from 'src/domain/artifacts/application/services/artifact-mask-allocation-lock.service';
import { ArtifactUnknownPlaceholderError } from 'src/domain/artifacts/application/artifacts.errors';
import type { PlaceholderDraft } from 'src/domain/artifacts/application/models/placeholder-draft';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { GetThreadPiiMasksQuery } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.query';
import { AllocateThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/allocate-thread-pii-masks/allocate-thread-pii-masks.use-case';
import { AllocateThreadPiiMasksCommand } from 'src/domain/thread-pii-masks/application/use-cases/allocate-thread-pii-masks/allocate-thread-pii-masks.command';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';

export interface ArtifactTextsForChat {
  /** Translates a text of one of the given artifacts into the chat's placeholders. */
  translate: (artifact: Artifact, text: string) => string;
  /**
   * The chat's full dictionary whenever the texts reference chat masks. A
   * run streams it, because masks created outside runs, e.g. by an editor
   * save's detection, have not reached the client yet.
   */
  threadPiiMasks: ThreadPiiMask[] | null;
}

/**
 * Translates the placeholders of anonymous artifacts between the artifact's
 * own mask dictionary and the chat of an anonymous run, by exact lookup of
 * the value behind each placeholder, never by detection.
 */
@Injectable()
export class ArtifactPlaceholdersService {
  private readonly logger = new Logger(ArtifactPlaceholdersService.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly allocationLock: ArtifactMaskAllocationLock,
    private readonly getThreadPiiMasksUseCase: GetThreadPiiMasksUseCase,
    private readonly allocateThreadPiiMasksUseCase: AllocateThreadPiiMasksUseCase,
  ) {}

  /**
   * Text written in the chat's placeholders, as a draft for the artifact's
   * dictionary. `build` receives the translation of chat placeholders; a
   * placeholder unknown to the chat rejects the draft.
   */
  async fromChat<T>(
    threadId: UUID,
    build: (translate: (text: string) => string) => T,
  ): Promise<PlaceholderDraft<T>> {
    const chatDictionary = await this.getThreadPiiMasksUseCase.execute(
      new GetThreadPiiMasksQuery(threadId),
    );
    return (dictionary) => {
      const translator = createPiiTokenTranslator(
        chatDictionary.map((mask) => mask.toPiiMask()),
        dictionary,
      );
      const rejectUnknown = () => {
        if (translator.unknownTokens.size > 0) {
          throw new ArtifactUnknownPlaceholderError([
            ...translator.unknownTokens,
          ]);
        }
      };
      let value: T;
      try {
        value = build(translator.translate);
      } catch (error) {
        // An edit whose old_text holds an unknown placeholder also fails to
        // match; the unknown placeholder is the error the model can fix.
        rejectUnknown();
        throw error;
      }
      rejectUnknown();
      return { value, newMasks: translator.newMasks };
    };
  }

  /**
   * Numbers a draft against an existing artifact's dictionary and hands the
   * value and the entries it adds to `persist`, which stores them together
   * with the version, so a write that fails stores no entries either. One
   * draft per artifact at a time, until it is persisted.
   */
  write<T, R>(
    artifactId: UUID,
    draft: PlaceholderDraft<T>,
    persist: (value: T, piiMasks: ArtifactPiiMask[]) => Promise<R>,
  ): Promise<R> {
    return this.allocationLock.runExclusive(artifactId, async () => {
      const dictionary =
        await this.artifactsRepository.findPiiMasks(artifactId);
      const { value, newMasks } = draft(
        dictionary.map((mask) => mask.toPiiMask()),
      );
      return persist(value, toArtifactMasks(artifactId, newMasks));
    });
  }

  /**
   * Texts of anonymous artifacts (loaded with their dictionaries) in the
   * chat's placeholders. Values the chat has no placeholder for get new chat
   * masks, persisted through the chat's dictionary. Placeholders an artifact
   * does not know stay as they are.
   */
  async toChat(
    threadId: UUID,
    sources: { artifact: Artifact; texts: string[] }[],
  ): Promise<ArtifactTextsForChat> {
    const referenced = sources.flatMap(({ artifact, texts }) =>
      findReferencedMasks(texts, dictionaryOf(artifact)),
    );
    if (referenced.length === 0) {
      return { translate: (_artifact, text) => text, threadPiiMasks: null };
    }
    const { masks, created } = await this.allocateThreadPiiMasksUseCase.execute(
      new AllocateThreadPiiMasksCommand(threadId, referenced),
    );
    this.logger.debug(
      {
        threadId,
        artifactCount: sources.length,
        placeholderCount: referenced.length,
        newThreadMaskCount: created.length,
      },
      'Translated artifact placeholders for a chat',
    );
    const chatDictionary = masks.map((mask) => mask.toPiiMask());
    const translators = new Map(
      sources.map(({ artifact }) => [
        artifact.id,
        createPiiTokenTranslator(dictionaryOf(artifact), chatDictionary),
      ]),
    );
    return {
      translate: (artifact, text) =>
        translators.get(artifact.id)?.translate(text) ?? text,
      threadPiiMasks: masks,
    };
  }
}

function dictionaryOf(artifact: Artifact): PiiMask[] {
  return artifact.piiMasks.map((mask) => mask.toPiiMask());
}

function toArtifactMasks(
  artifactId: UUID,
  masks: PiiMask[],
): ArtifactPiiMask[] {
  return masks.map((mask) => ArtifactPiiMask.fromPiiMask(artifactId, mask));
}
