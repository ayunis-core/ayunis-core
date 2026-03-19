/**
 * Returns the start and end dates for a given calendar month.
 * Start is midnight on the 1st, end is midnight on the 1st of the next month.
 */
export function getMonthDateRange(
  year: number,
  month: number,
): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);
  return { startDate, endDate };
}
