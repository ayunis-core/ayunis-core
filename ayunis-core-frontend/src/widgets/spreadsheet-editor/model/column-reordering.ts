export function getColumnDragId(index: number): string {
  return `column-${index}`;
}

export function resolveColumnReorder(
  activeId: string,
  overId: string | undefined,
): { from: number; to: number } | null {
  if (overId === undefined || activeId === overId) {
    return null;
  }
  const from = Number(activeId.split('-')[1]);
  const to = Number(overId.split('-')[1]);
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return null;
  }
  return { from, to };
}
