import { errorMessage } from '@/outlook/lib/outlook-tools/office-async';
import {
  currentOutlookItem,
  currentOutlookItemKey,
  type OutlookItem,
} from '@/outlook/lib/outlook-tools/outlook-item';
import {
  readAttachment,
  toolError,
  type ExtractAttachmentText,
} from '@/outlook/lib/outlook-tools/read-attachment';
import { readEmail } from '@/outlook/lib/outlook-tools/read-email';
import {
  draftEmail,
  moveEmailToComposer,
  NothingToSaveError,
  saveEmailToDraft,
  type OutlookWriteAction,
} from '@/outlook/lib/outlook-tools/write-email';
import {
  OUTLOOK_TOOL,
  type OutlookToolName,
} from '@/outlook/lib/outlook-tools/outlook-tool-names';

export type { OutlookWriteAction };
export type OutlookWriteFailure =
  'noItem' | 'nothingToSave' | 'officeFailed' | 'itemChanged';
export type OutlookToolOutcome =
  | { status: 'result'; result: string }
  | { status: 'done'; action: OutlookWriteAction }
  | { status: 'failed'; failure: OutlookWriteFailure; message?: string };

export interface OutlookToolDependencies {
  extractAttachmentText?: ExtractAttachmentText;
  /** The mail the run started on; the tool refuses to act on any other. */
  expectedItemKey?: string;
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
    return {
      status: 'failed',
      failure: 'officeFailed',
      message: errorMessage(error),
    };
  }
}

function movedToAnotherItem(expectedItemKey?: string): boolean {
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
