import {
  ArtifactResponseDtoType,
  ArtifactVersionResponseDtoAuthorType,
  type ArtifactResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ProjectDocument } from '@/entities/project';

function toHtml(content: string) {
  return content
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const isHeading = lines.length === 1 && !block.endsWith('.');
      if (isHeading) {
        return `<h2>${block}</h2>`;
      }
      return `<p>${lines.join('<br />')}</p>`;
    })
    .join('');
}

export function toMockArtifact(doc: ProjectDocument): ArtifactResponseDto {
  const createdAt = '2026-07-29T14:20:00.000Z';
  return {
    id: doc.id,
    type:
      doc.kind === 'diagram'
        ? ArtifactResponseDtoType.diagram
        : ArtifactResponseDtoType.document,
    threadId: doc.chatId ?? '',
    userId: 'u1',
    title: doc.name,
    currentVersionNumber: 1,
    versions: [
      {
        id: `${doc.id}-v1`,
        artifactId: doc.id,
        versionNumber: 1,
        content: toHtml(doc.content ?? ''),
        authorType: ArtifactVersionResponseDtoAuthorType.ASSISTANT,
        createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}
