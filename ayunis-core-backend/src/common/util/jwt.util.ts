export function getMillisecondsFromJwtExpiry(expiryString: string): number {
  const unit = expiryString.charAt(expiryString.length - 1);
  const value = parseInt(expiryString.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 3600 * 1000; // Default 1 hour
  }
}
