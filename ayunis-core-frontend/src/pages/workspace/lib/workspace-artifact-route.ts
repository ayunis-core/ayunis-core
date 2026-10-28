export function getWorkspaceArtifactRoute({
  id,
  threadId,
}: Readonly<{ id: string; threadId: string }>) {
  return { threadId, artifactId: id };
}
