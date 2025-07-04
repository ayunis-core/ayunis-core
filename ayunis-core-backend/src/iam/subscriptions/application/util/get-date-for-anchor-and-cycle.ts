import { RenewalCycle } from '../../domain/value-objects/renewal-cycle.enum';

export function getNextDate(params: {
  anchorDate: Date;
  targetDate: Date;
  cycle: RenewalCycle;
}): Date {
  const { anchorDate, targetDate, cycle } = params;

  // Validate that anchor date is before target date
  if (anchorDate > targetDate) {
    throw new Error('Anchor date cannot be after target date');
  }

  let current = new Date(anchorDate);

  // Find the next period after target
  while (current <= targetDate) {
    if (cycle === RenewalCycle.MONTHLY) {
      current = addMonths(current, 1);
    } else if (cycle === RenewalCycle.YEARLY) {
      current = addYears(current, 1);
    }
  }

  return current;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const currentDay = result.getUTCDate();
  const currentMonth = result.getUTCMonth();
  const currentYear = result.getUTCFullYear();

  // Calculate target year and month
  const targetMonth = currentMonth + months;
  const targetYear = currentYear + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  // Set the new year and month
  result.setUTCFullYear(targetYear, normalizedMonth, currentDay);

  // Handle month overflow (e.g., Jan 31 + 1 month should be Feb 28/29, not Mar 3)
  if (result.getUTCDate() !== currentDay) {
    // If we overflowed, set to the last day of the target month
    result.setUTCFullYear(targetYear, normalizedMonth + 1, 0);
  }

  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const currentDay = result.getUTCDate();
  const currentMonth = result.getUTCMonth();
  const currentYear = result.getUTCFullYear();

  result.setUTCFullYear(currentYear + years, currentMonth, currentDay);

  // Handle leap year edge case (Feb 29 -> Feb 28 in non-leap years)
  if (result.getUTCMonth() !== currentMonth) {
    result.setUTCFullYear(currentYear + years, currentMonth + 1, 0);
  }

  return result;
}
