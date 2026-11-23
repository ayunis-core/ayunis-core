import { Injectable, Logger } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindArtifactsForRunUseCase } from 'src/domain/artifacts/application/use-cases/find-artifacts-for-run/find-artifacts-for-run.use-case';
import { FindArtifactsForRunQuery } from 'src/domain/artifacts/application/use-cases/find-artifacts-for-run/find-artifacts-for-run.query';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { FindAllLetterheadsUseCase } from 'src/domain/letterheads/application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { buildLetterheadSuffix } from './letterhead-suffix.helper';

/** An artifact with its title as the run reads it. */
interface ListedArtifact {
  artifact: Artifact;
  title: string;
}

export interface AssembledArtifactTools {
  tools: Tool[];
  /** The chat's full dictionary, for streaming, when listed titles reference chat masks. */
  threadPiiMasks: ThreadPiiMask[] | null;
}

const ofType =
  <T extends Artifact>(type: abstract new (...args: never[]) => T) =>
  (listed: ListedArtifact): boolean =>
    listed.artifact instanceof type;

/**
 * Assembles artifact-related tools (document + diagram + spreadsheet) for a
 * thread, used by `ArtifactsCapability`.
 */
@Injectable()
export class ArtifactToolAssemblerService {
  private readonly logger = new Logger(ArtifactToolAssemblerService.name);

  constructor(
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly findArtifactsForRunUseCase: FindArtifactsForRunUseCase,
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
    private readonly findAllLetterheadsUseCase: FindAllLetterheadsUseCase,
  ) {}

  /**
   * A run only gets the linked artifacts of its own mode: anonymous runs
   * (anonymous chat, or a model with enforced anonymous mode) anonymous
   * artifacts, normal runs normal ones. Anonymous artifacts are listed with
   * their titles in the chat's placeholders.
   */
  async assembleArtifactTools(
    thread: Thread,
    isAnonymous: boolean,
  ): Promise<AssembledArtifactTools> {
    const letterheads = await this.fetchLetterheadsSafe();
    const letterheadSuffix = buildLetterheadSuffix(letterheads);
    const { artifacts, threadPiiMasks } =
      await this.findArtifactsForRunUseCase.execute(
        new FindArtifactsForRunQuery({
          run: { threadId: thread.id, isAnonymous },
        }),
      );

    const tools = [
      await this.assembleCreateDocumentTool(letterheadSuffix),
      ...(await this.assembleDocumentEditTools(
        artifacts.filter(ofType(DocumentArtifact)),
        letterheadSuffix,
      )),
      await this.assembleCreateTool(ToolType.CREATE_DIAGRAM),
      ...(await this.assembleExistingArtifactTools(
        artifacts.filter(ofType(DiagramArtifact)),
        [ToolType.UPDATE_DIAGRAM, ToolType.READ_DIAGRAM],
        'diagrams',
        ({ artifact, title }) => `- ${artifact.id}: "${title}"`,
      )),
      await this.assembleCreateTool(ToolType.CREATE_SPREADSHEET),
      ...(await this.assembleExistingArtifactTools(
        artifacts.filter(ofType(SpreadsheetArtifact)),
        [ToolType.UPDATE_SPREADSHEET, ToolType.READ_SPREADSHEET],
        'spreadsheets',
        async ({ artifact, title }) => {
          const warning = (await this.isUserEdited(artifact))
            ? ' (⚠ user-edited — use read_spreadsheet before updating)'
            : '';
          return `- ${artifact.id}: "${title}" (current version ${artifact.currentVersionNumber})${warning}`;
        },
      )),
    ];
    return { tools, threadPiiMasks };
  }

  private async isUserEdited(artifact: Artifact): Promise<boolean> {
    const full = await this.findArtifactWithVersionsUseCase.execute(
      new FindArtifactWithVersionsQuery({ artifactId: artifact.id }),
    );
    const current = full.versions.find(
      (v) => v.versionNumber === full.currentVersionNumber,
    );
    return current?.authorType === AuthorType.USER;
  }

  private async assembleCreateTool(type: ToolType): Promise<Tool> {
    return this.assembleToolsUseCase.execute(new AssembleToolCommand({ type }));
  }

  private async assembleCreateDocumentTool(
    letterheadSuffix: string,
  ): Promise<Tool> {
    const tool = await this.assembleCreateTool(ToolType.CREATE_DOCUMENT);
    if (letterheadSuffix) {
      tool.descriptionLong = `${tool.descriptionLong ?? tool.description}${letterheadSuffix}`;
    }
    return tool;
  }

  private async assembleDocumentEditTools(
    documents: ListedArtifact[],
    letterheadSuffix: string,
  ): Promise<Tool[]> {
    const artifactLines: string[] = [];
    for (const { artifact, title } of documents) {
      const warn = (await this.isUserEdited(artifact))
        ? ' (⚠ user-edited — use read_document before editing)'
        : '';
      artifactLines.push(`- ${artifact.id}: "${title}"${warn}`);
    }

    const suffix =
      artifactLines.length > 0
        ? `\n\nAvailable documents in this conversation:\n${artifactLines.join('\n')}`
        : '';

    const toolTypes = [
      ToolType.UPDATE_DOCUMENT,
      ToolType.EDIT_DOCUMENT,
      ToolType.READ_DOCUMENT,
    ];
    const tools: Tool[] = [];
    for (const type of toolTypes) {
      const tool = await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type }),
      );
      const extra =
        type === ToolType.UPDATE_DOCUMENT
          ? `${suffix}${letterheadSuffix}`
          : suffix;
      if (extra) {
        tool.descriptionLong = `${tool.descriptionLong ?? tool.description}${extra}`;
      }
      tools.push(tool);
    }
    return tools;
  }

  private async assembleExistingArtifactTools(
    artifacts: ListedArtifact[],
    toolTypes: ToolType[],
    label: string,
    formatLine: (listed: ListedArtifact) => string | Promise<string>,
  ): Promise<Tool[]> {
    if (artifacts.length === 0) {
      return [];
    }

    const artifactLines = await Promise.all(
      artifacts.map(async (listed) => formatLine(listed)),
    );
    const suffix = `\n\nAvailable ${label} in this conversation:\n${artifactLines.join('\n')}`;

    const tools: Tool[] = [];
    for (const type of toolTypes) {
      const tool = await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type }),
      );
      tool.descriptionLong = `${tool.descriptionLong ?? tool.description}${suffix}`;
      tools.push(tool);
    }
    return tools;
  }

  private async fetchLetterheadsSafe(): Promise<Letterhead[]> {
    try {
      return await this.findAllLetterheadsUseCase.execute();
    } catch (error) {
      this.logger.warn(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to fetch letterheads, continuing without them',
      );
      return [];
    }
  }
}
