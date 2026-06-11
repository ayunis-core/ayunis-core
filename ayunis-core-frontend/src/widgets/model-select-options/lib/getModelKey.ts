function normalizeModelKey(modelName: string): string {
  return modelName.toLowerCase().replace(/[^a-z0-9-]/g, '_');
}

export function getModelKey(modelName: string): string {
  return normalizeModelKey(modelName);
}

export function getModelKeyFallbacks(modelName: string): string[] {
  return modelName
    .split('.')
    .map((_, index, segments) =>
      normalizeModelKey(segments.slice(index).join('.')),
    );
}
