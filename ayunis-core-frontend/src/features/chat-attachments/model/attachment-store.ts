import { generateUUID } from '@/shared/lib/uuid';

export interface ChatAttachment {
  id: string;
  scope: string;
  name: string;
  type: 'text' | 'data';
  submitted: boolean;
  status: 'processing' | 'failed';
  uploadProgress?: number;
  sourceIds: string[];
  attached?: boolean;
  removing?: boolean;
}

let attachments: ChatAttachment[] = [];
const listeners = new Set<() => void>();
export const getAttachments = () => attachments;
export function subscribeAttachments(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(next: ChatAttachment[]) {
  attachments = next;
  listeners.forEach((listener) => listener());
}
export function addAttachment(scope: string, file: File): string {
  const id = generateUUID();
  publish([
    ...attachments,
    {
      id,
      scope,
      name: file.name,
      type: /\.(csv|xlsx?)$/i.test(file.name) ? 'data' : 'text',
      submitted: false,
      status: 'processing',
      uploadProgress: 0,
      sourceIds: [],
    },
  ]);
  return id;
}
export function updateAttachment(id: string, update: Partial<ChatAttachment>) {
  publish(
    attachments.map((item) => (item.id === id ? { ...item, ...update } : item)),
  );
}
export function removeAttachment(id: string) {
  publish(attachments.filter((item) => item.id !== id));
}
export function submitAttachments(ids: string[], threadId: string) {
  publish(
    attachments.map((item) =>
      ids.includes(item.id)
        ? { ...item, scope: threadId, submitted: true }
        : item,
    ),
  );
}
