import { errorMessage } from '@/features/outlook-tools/lib/office-async';
import {
  currentOutlookItem,
  currentOutlookItemKey,
  currentOutlookReplySourceKey,
  isReadItemKey,
  type OutlookItem,
} from '@/features/outlook-tools/lib/outlook-item';
import {
  readAttachment,
  toolError,
  type ExtractAttachmentText,
} from '@/features/outlook-tools/lib/read-attachment';
import { readEmail } from '@/features/outlook-tools/lib/read-email';
import {
  draftEmail,
  ItemChangedError,
  moveEmailToComposer,
  NoComposeItemError,
  NothingToSaveError,
  saveEmailToDraft,
  type OutlookWriteAction,
} from '@/features/outlook-tools/lib/write-email';
import {
  OUTLOOK_TOOL,
  isOutlookDraftTool,
  type OutlookToolName,
} from '@/features/outlook-tools/lib/outlook-tool-names';

type OutlookWriteFailure =
  'noItem' | 'noComposeItem' | 'nothingToSave' | 'officeFailed' | 'itemChanged';
export type OutlookToolOutcome =
  | { status: 'result'; result: string }
  | { status: 'done'; action: OutlookWriteAction }
  | { status: 'failed'; failure: OutlookWriteFailure; message?: string };

export interface OutlookToolDependencies {
  signal?: AbortSignal;
  extractAttachmentText?: ExtractAttachmentText;
  /**
   * The mail the run started on, null when none was open; the tool refuses
   * to act on any other. Without it the tool acts on whatever is open.
   */
  expectedItemKey?: string | null;
  /** The source of the open reply when inserting a draft from read mode. */
  expectedReplySourceKey?: string;
  draftId?: string;
}

type ReadToolName =
  typeof OUTLOOK_TOOL.readEmail | typeof OUTLOOK_TOOL.readAttachment;

function isReadTool(name: OutlookToolName): name is ReadToolName {
  return (
    name === OUTLOOK_TOOL.readEmail || name === OUTLOOK_TOOL.readAttachment
  );
}

async function runReadTool(
  name: ReadToolName,
  params: Record<string, unknown>,
  dependencies: OutlookToolDependencies,
): Promise<string> {
  const outlookItem = currentOutlookItem();
  if (!outlookItem) return toolError('no email is open');
  try {
    return name === OUTLOOK_TOOL.readEmail
      ? await readEmail(outlookItem)
      : await readAttachment(
          outlookItem,
          params,
          guardedAttachmentExtractor(dependencies),
        );
  } catch (error) {
    return toolError(errorMessage(error));
  }
}

function guardedAttachmentExtractor({
  extractAttachmentText,
  expectedItemKey,
  signal,
}: OutlookToolDependencies): ExtractAttachmentText | undefined {
  if (!extractAttachmentText) return undefined;
  return (file) => {
    signal?.throwIfAborted();
    if (movedToAnotherItem(expectedItemKey)) {
      throw new Error('the open email changed since this request started');
    }
    return extractAttachmentText(file);
  };
}

function writeAction(
  name: Exclude<OutlookToolName, ReadToolName>,
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
  draftId?: string,
  signal?: AbortSignal,
): Promise<OutlookWriteAction> {
  switch (name) {
    case OUTLOOK_TOOL.draftEmail:
      return draftEmail(outlookItem, params, draftId, signal);
    case OUTLOOK_TOOL.moveEmailToComposer:
      return moveEmailToComposer(outlookItem, params, draftId, signal);
    case OUTLOOK_TOOL.saveEmailToDraft:
      return saveEmailToDraft(outlookItem, signal);
  }
}

async function runWriteTool(
  name: Exclude<OutlookToolName, ReadToolName>,
  params: Record<string, unknown>,
  draftId?: string,
  signal?: AbortSignal,
): Promise<OutlookToolOutcome> {
  const outlookItem = currentOutlookItem();
  if (!outlookItem) return { status: 'failed', failure: 'noItem' };
  try {
    return {
      status: 'done',
      action: await writeAction(name, outlookItem, params, draftId, signal),
    };
  } catch (error) {
    if (error instanceof NothingToSaveError) {
      return { status: 'failed', failure: 'nothingToSave' };
    }
    if (error instanceof NoComposeItemError) {
      return { status: 'failed', failure: 'noComposeItem' };
    }
    if (error instanceof ItemChangedError) {
      return { status: 'failed', failure: 'itemChanged' };
    }
    return {
      status: 'failed',
      failure: 'officeFailed',
      message: errorMessage(error),
    };
  }
}

function movedToAnotherItem(expectedItemKey?: string | null): boolean {
  return (
    expectedItemKey !== undefined && currentOutlookItemKey() !== expectedItemKey
  );
}

function itemChangedResult(): string {
  return toolError('the open email changed since this request started');
}

export async function executeOutlookTool(
  name: OutlookToolName,
  params: Record<string, unknown>,
  dependencies: OutlookToolDependencies = {},
): Promise<OutlookToolOutcome> {
  const { expectedItemKey, expectedReplySourceKey, signal } = dependencies;
  signal?.throwIfAborted();
  if (
    movedToAnotherItem(expectedItemKey) ||
    (expectedReplySourceKey !== undefined &&
      currentOutlookReplySourceKey() !== expectedReplySourceKey)
  ) {
    return isReadTool(name)
      ? {
          status: 'result',
          result: itemChangedResult(),
        }
      : { status: 'failed', failure: 'itemChanged' };
  }
  if (isReadTool(name)) {
    const result = await runReadTool(name, params, dependencies);
    return {
      status: 'result',
      result: movedToAnotherItem(expectedItemKey)
        ? itemChangedResult()
        : result,
    };
  }
  return runWriteTool(name, params, dependencies.draftId, dependencies.signal);
}

/**
 * A draft generated in read mode is only inserted on request in a reply.
 * Use the mail the run started on even if the user has since switched items.
 */
export function waitsForUser(
  name: OutlookToolName,
  itemKey: string | null,
): boolean {
  return isOutlookDraftTool(name) && isReadItemKey(itemKey);
}
