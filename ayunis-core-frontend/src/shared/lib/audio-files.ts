// Recordings the backend transcribes; mirrors isAudioFile in the backend's
// src/common/util/file-type.ts.
export const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.webm'];

export const ACCEPTED_AUDIO_PICKER_TYPES = AUDIO_EXTENSIONS.join(',');

export function isAudioFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
