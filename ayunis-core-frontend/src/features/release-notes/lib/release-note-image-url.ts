import config from '@/shared/config';

export function releaseNoteImageUrl(releaseNoteId: string): string {
  return `${config.api.baseUrl}/release-notes/${releaseNoteId}/image`;
}
