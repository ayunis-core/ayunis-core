/** `dnt=1` keeps Vimeo from setting tracking cookies. */
export function vimeoEmbedUrl(videoId: string, hash?: string | null): string {
  const params = new URLSearchParams({ dnt: '1' });
  if (hash) params.set('h', hash);
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?${params.toString()}`;
}
