export function XAxisTick({ x, y, payload, maxChars, doTruncate = false }: any & { maxChars: number; doTruncate?: boolean }) {
  const original = String(payload?.value ?? "");
  const display = doTruncate && maxChars > 0
    ? `${original}`.length > maxChars
      ? `${original.slice(0, Math.max(0, maxChars - 1))}…`
      : original
    : original;

  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={16} textAnchor="middle" className="fill-muted-foreground text-xs">
        <title>{original}</title>
        {display}
      </text>
    </g>
  );
}


