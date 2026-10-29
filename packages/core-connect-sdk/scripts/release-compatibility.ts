import { lt, major, minor, valid } from "semver";

export function assertReleaseCompatibility(
  candidate: string,
  baseline: string,
  compatible: boolean,
): void {
  if (!valid(candidate) || !valid(baseline) || lt(candidate, baseline))
    throw new Error("SDK versions must be valid and must not move backwards");
  const breakingRelease =
    major(candidate) > major(baseline) ||
    (major(candidate) === 0 && minor(candidate) > minor(baseline));
  if (!compatible && !breakingRelease)
    throw new Error(
      "SDK compatibility changed without a breaking release version",
    );
}
