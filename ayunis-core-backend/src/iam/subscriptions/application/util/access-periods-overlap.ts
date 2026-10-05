interface AccessPeriod {
  startsAt: Date;
  accessEndsAt: Date | null;
}

export function accessPeriodsOverlap(
  left: AccessPeriod,
  right: AccessPeriod,
): boolean {
  if (isEmpty(left) || isEmpty(right)) {
    return false;
  }
  const leftEndsAfterRightStarts =
    left.accessEndsAt === null || left.accessEndsAt > right.startsAt;
  const rightEndsAfterLeftStarts =
    right.accessEndsAt === null || right.accessEndsAt > left.startsAt;
  return leftEndsAfterRightStarts && rightEndsAfterLeftStarts;
}

function isEmpty(period: AccessPeriod): boolean {
  return period.accessEndsAt !== null && period.accessEndsAt <= period.startsAt;
}
