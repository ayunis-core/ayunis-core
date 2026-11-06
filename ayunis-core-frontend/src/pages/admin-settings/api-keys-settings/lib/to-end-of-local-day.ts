// Calendar default UTC-midnight semantics would expire a "31 Dec" key hours
// before the user's local 31 Dec ends. Anchor to local end-of-day instead.
export function toEndOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}
