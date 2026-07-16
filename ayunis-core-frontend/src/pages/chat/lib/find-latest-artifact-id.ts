import type { ArtifactResponseDto } from '@/shared/api';

type ArtifactSummary = Pick<
  ArtifactResponseDto,
  'id' | 'title' | 'type' | 'createdAt'
>;

export function findLatestArtifactId(
  artifacts: readonly ArtifactSummary[],
  title: string | undefined,
  type?: ArtifactResponseDto['type'],
): string | null {
  let latest: { id: string; createdAt: number } | undefined;

  for (const artifact of artifacts) {
    if (
      artifact.title !== title ||
      (type !== undefined && artifact.type !== type)
    ) {
      continue;
    }

    const createdAt = new Date(artifact.createdAt).getTime();
    if (latest === undefined || createdAt > latest.createdAt) {
      latest = { id: artifact.id, createdAt };
    }
  }

  return latest?.id ?? null;
}
