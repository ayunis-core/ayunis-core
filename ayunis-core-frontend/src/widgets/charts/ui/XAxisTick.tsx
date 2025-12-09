interface XAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  maxChars: number;
  doTruncate?: boolean;
}

const ROTATE_THRESHOLD = 12;
const TRUNCATE_LENGTH = 20;

export function XAxisTick({
  x,
  y,
  payload,
  maxChars,
  doTruncate = false,
}: XAxisTickProps) {
  const original = payload?.value?.toString() ?? '';

  // Always truncate long labels
  const truncated =
    original.length > TRUNCATE_LENGTH
      ? `${original.slice(0, TRUNCATE_LENGTH)}…`
      : original;

  // Additional truncation if doTruncate is set (many data points)
  const display =
    doTruncate && maxChars > 0 && truncated.length > maxChars
      ? `${truncated.slice(0, Math.max(0, maxChars - 1))}…`
      : truncated;

  const shouldRotate = original.length > ROTATE_THRESHOLD;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={shouldRotate ? 8 : 16}
        textAnchor={shouldRotate ? 'end' : 'middle'}
        transform={shouldRotate ? 'rotate(-25)' : undefined}
        className="fill-muted-foreground text-xs"
      >
        <title>{original}</title>
        {display}
      </text>
    </g>
  );
}
