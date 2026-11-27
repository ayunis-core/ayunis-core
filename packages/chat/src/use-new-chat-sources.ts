import { useCallback, useState } from 'react';
import type { ChatSourceAttachment } from '@ayunis/chat/attachments';

export interface NewChatSourceFile {
  readonly id: string;
  readonly name: string;
  readonly type: 'text' | 'data';
  readonly file: File;
}

export type NewChatSourceStatus =
  /** `progress` is the fraction of bytes stored so far, 0..1. */
  | { readonly kind: 'uploading'; readonly progress: number }
  | { readonly kind: 'processing' }
  | { readonly kind: 'failed'; readonly message: string };

type QueuedSource = NewChatSourceFile &
  Pick<ChatSourceAttachment, 'fileType' | 'status' | 'uploadProgress'>;

function withStatus(
  source: QueuedSource,
  status: NewChatSourceStatus,
): QueuedSource {
  return {
    ...source,
    status: status.kind === 'failed' ? 'failed' : 'processing',
    uploadProgress: status.kind === 'uploading' ? status.progress : undefined,
  };
}

function withoutStatus(source: QueuedSource): QueuedSource {
  return { ...source, status: undefined, uploadProgress: undefined };
}

/** Files queued for a chat that doesn't exist yet; the host uploads them when it starts it. */
export function useNewChatSources() {
  const [items, setItems] = useState<readonly QueuedSource[]>([]);
  const add = useCallback((files: File[]) => {
    const added = files.map((file): QueuedSource => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.name.endsWith('.csv') ? 'data' : 'text',
      fileType: file.type.startsWith('audio/') ? 'audio' : undefined,
      file,
    }));
    setItems((current) => [...current, ...added]);
  }, []);
  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((source) => source.id !== id));
  }, []);
  const setStatus = useCallback((id: string, status: NewChatSourceStatus) => {
    setItems((current) =>
      current.map((source) =>
        source.id === id ? withStatus(source, status) : source,
      ),
    );
  }, []);
  const resetStatus = useCallback(() => {
    setItems((current) => current.map(withoutStatus));
  }, []);
  return {
    items,
    files: items.map(({ id, name, type, file }) => ({ id, name, type, file })),
    add,
    remove,
    setStatus,
    resetStatus,
  };
}
