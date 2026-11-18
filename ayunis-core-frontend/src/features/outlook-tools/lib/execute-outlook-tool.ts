import { errorMessage } from '@/features/outlook-tools/lib/office-async';
import {
  currentOutlookItem,
  currentOutlookItemKey,
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
  NothingToSaveError,
  saveEmailToDraft,
  type OutlookWriteAction,
} from '@/features/outlook-tools/lib/write-email';
import {
  OUTLOOK_TOOL,
  type OutlookToolName,
} from '@/features/outlook-tools/lib/outlook-tool-names';

export type { OutlookWriteAction };
export type OutlookWriteFailure =
  'noItem' | 'nothingToSave' | 'officeFailed' | 'itemChanged';
export type OutlookToolOutcome =
  | { status: 'result'; result: string }
  | { status: 'done'; action: OutlookWriteAction }
  | { status: 'failed'; failure: OutlookWriteFailure; message?: string };

export interface OutlookToolDependencies {
  extractAttachmentText?: ExtractAttachmentText;
  /**
   * The mail the run started on, null when none was open; the tool refuses
   * to act on any other. Without it the tool acts on whatever is open.
   */
  expectedItemKey?: string | null;
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
          dependencies.extractAttachmentText,
        );
  } catch (error) {
    return toolError(errorMessage(error));
  }
}

function writeAction(
  name: Exclude<OutlookToolName, ReadToolName>,
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
): Promise<OutlookWriteAction> {
  switch (name) {
    case OUTLOOK_TOOL.draftEmail:
      return draftEmail(outlookItem, params);
    case OUTLOOK_TOOL.moveEmailToComposer:
      return moveEmailToComposer(outlookItem, params);
    case OUTLOOK_TOOL.saveEmailToDraft:
      return saveEmailToDraft(outlookItem);
  }
}

async function runWriteTool(
  name: Exclude<OutlookToolName, ReadToolName>,
  params: Record<string, unknown>,
): Promise<OutlookToolOutcome> {
  const outlookItem = currentOutlookItem();
  if (!outlookItem) return { status: 'failed', failure: 'noItem' };
  try {
    return {
      status: 'done',
      action: await writeAction(name, outlookItem, params),
    };
  } catch (error) {
    if (error instanceof NothingToSaveError) {
      return { status: 'failed', failure: 'nothingToSave' };
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

export async function executeOutlookTool(
  name: OutlookToolName,
  params: Record<string, unknown>,
  dependencies: OutlookToolDependencies = {},
): Promise<OutlookToolOutcome> {
  if (movedToAnotherItem(dependencies.expectedItemKey)) {
    return isReadTool(name)
      ? {
          status: 'result',
          result: toolError(
            'the open email changed since this request started',
          ),
        }
      : { status: 'failed', failure: 'itemChanged' };
  }
  if (isReadTool(name)) {
    return {
      status: 'result',
      result: await runReadTool(name, params, dependencies),
    };
  }
  return runWriteTool(name, params);
}

/**
 * A draft for a mail being read opens Outlook's reply form, which only the
 * user starts; a run leaves it to them. Decided by the mail the run was
 * about, not the one open when it ends.
 */
export function waitsForUser(
  name: OutlookToolName,
  itemKey: string | null,
): boolean {
  return (
    (name === OUTLOOK_TOOL.draftEmail ||
      name === OUTLOOK_TOOL.moveEmailToComposer) &&
    isReadItemKey(itemKey)
  );
}
