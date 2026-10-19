export function certificateExpirySql(timestampTimeZone: string): string {
  const instant = completionInstantSql(timestampTimeZone);
  return `CASE WHEN :renewalRequired THEN
    (((${instant}) AT TIME ZONE 'UTC' + make_interval(months => :validityMonths)) AT TIME ZONE 'UTC')
    ELSE NULL::timestamptz END`;
}

function completionInstantSql(timestampTimeZone: string): string {
  const column = `date_trunc('milliseconds', member."completedAt")`;
  const candidate = `(${column} AT TIME ZONE :timestampTimeZone)`;
  if (timestampTimeZone === 'UTC') return candidate;

  // pg's Date parser picks the earlier instant in a repeated local hour;
  // PostgreSQL picks the later one. Use the prior offset only if it round-trips.
  const previous = `(${candidate} - INTERVAL '48 hours')`;
  const previousOffset = `((${previous} AT TIME ZONE :timestampTimeZone) - (${previous} AT TIME ZONE 'UTC'))`;
  const earlier = `((${column} - ${previousOffset}) AT TIME ZONE 'UTC')`;
  return `CASE WHEN ${earlier} < ${candidate}
    AND (${earlier} AT TIME ZONE :timestampTimeZone) = ${column}
    THEN ${earlier} ELSE ${candidate} END`;
}
