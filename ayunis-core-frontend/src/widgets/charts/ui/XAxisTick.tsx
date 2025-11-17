interface XAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  maxChars: number;
  doTruncate?: boolean;
}

export function XAxisTick({
  x,
  y,
  payload,
  maxChars,
  doTruncate = false,
}: XAxisTickProps) {
  const original = payload?.value?.toString() ?? '';
  const display =
    doTruncate && maxChars > 0
      ? `${original}`.length > maxChars
        ? `${original.slice(0, Math.max(0, maxChars - 1))}…`
        : original
      : original;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={16}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        <title>{original}</title>
        {display}
      </text>
    </g>
  );
}
