const REGION_PREFIXES = ['eu', 'us', 'apac', 'global'];
const PROVIDER_PREFIXES = [
  'anthropic',
  'amazon',
  'meta',
  'mistral',
  'cohere',
  'ai21',
];

export function getModelKey(modelName: string): string {
  const segments = modelName.toLowerCase().split('.');
  while (
    segments.length > 1 &&
    (REGION_PREFIXES.includes(segments[0]) ||
      PROVIDER_PREFIXES.includes(segments[0]))
  ) {
    segments.shift();
  }
  return segments.join('.').replace(/[^a-z0-9-]/g, '_');
}
