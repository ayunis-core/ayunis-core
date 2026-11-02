export function stripProviderSuffix(displayName: string): string {
  const openIndex = displayName.lastIndexOf('(');
  if (openIndex > 0 && displayName.trimEnd().endsWith(')')) {
    return displayName.slice(0, openIndex).trimEnd();
  }
  return displayName;
}
