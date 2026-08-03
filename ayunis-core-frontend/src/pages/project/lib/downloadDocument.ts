import type { ProjectDocument } from '@/entities/project';

export function downloadDocument(doc: ProjectDocument) {
  const blob = new Blob([doc.content ?? ''], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = doc.name;
  link.click();
  URL.revokeObjectURL(url);
}
