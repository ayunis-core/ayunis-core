export function matchesSearch(
  query: string,
  fields: readonly (string | null | undefined)[],
): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return fields.some((field) =>
    (field ?? '').toLocaleLowerCase().includes(needle),
  );
}
