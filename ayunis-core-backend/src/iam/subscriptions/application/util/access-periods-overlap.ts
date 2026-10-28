interface AccessPeriod {
  startsAt: Date;
  endsAt: Date | null;
}

export function accessPeriodsOverlap(
  left: AccessPeriod,
  right: AccessPeriod,
): boolean {
  if (isEmpty(left) || isEmpty(right)) {
    return false;
  }
  const leftEndsAfterRightStarts =
    left.endsAt === null || left.endsAt > right.startsAt;
  const rightEndsAfterLeftStarts =
    right.endsAt === null || right.endsAt > left.startsAt;
  return leftEndsAfterRightStarts && rightEndsAfterLeftStarts;
}

function isEmpty(period: AccessPeriod): boolean {
  return period.endsAt !== null && period.endsAt <= period.startsAt;
}
