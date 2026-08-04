export interface ToolOutcomeSample {
  toolName: string;
  result: string;
  isError?: boolean;
}

export interface TrippedToolFailure {
  toolName: string;
  failureCount: number;
}

const MAX_CONSECUTIVE_IDENTICAL_TOOL_FAILURES = 3;

/**
 * Detects a feedback loop that is not converging: the model keeps making the
 * same tool call across iterations and receives the identical error back
 * every time (e.g. it repeats schema-invalid arguments verbatim, AYC-646).
 * Tripping after a few identical failures surfaces one clear error instead
 * of burning the remaining iterations on attempts that cannot succeed.
 *
 * A phase (one `record` call) counts at most once per tool: repeats within a
 * single model turn precede any feedback, so only cross-phase repetition
 * proves the model saw the error and did not adapt. A success anywhere in
 * the phase, or a changed error text, resets the tool's streak — those loops
 * are still converging.
 */
export class ToolFailureBreaker {
  private readonly streaks = new Map<
    string,
    { signature: string; count: number }
  >();

  /** Records one tool phase's results; returns the failure that tripped the breaker, if any. */
  record(outcomes: readonly ToolOutcomeSample[]): TrippedToolFailure | null {
    let tripped: TrippedToolFailure | null = null;
    for (const [toolName, group] of groupByTool(outcomes)) {
      const count = this.updateStreak(toolName, group);
      if (count >= MAX_CONSECUTIVE_IDENTICAL_TOOL_FAILURES) {
        tripped ??= { toolName, failureCount: count };
      }
    }
    return tripped;
  }

  private updateStreak(
    toolName: string,
    group: readonly ToolOutcomeSample[],
  ): number {
    if (group.some((outcome) => !outcome.isError)) {
      this.streaks.delete(toolName);
      return 0;
    }
    const signatures = new Set(group.map((outcome) => outcome.result));
    const signature = group[group.length - 1].result;
    const streak = this.streaks.get(toolName);
    const repeatsIdentically =
      signatures.size === 1 && streak?.signature === signature;
    const count = repeatsIdentically ? streak.count + 1 : 1;
    this.streaks.set(toolName, { signature, count });
    return count;
  }
}

function groupByTool(
  outcomes: readonly ToolOutcomeSample[],
): Map<string, ToolOutcomeSample[]> {
  const groups = new Map<string, ToolOutcomeSample[]>();
  for (const outcome of outcomes) {
    const group = groups.get(outcome.toolName);
    if (group) {
      group.push(outcome);
    } else {
      groups.set(outcome.toolName, [outcome]);
    }
  }
  return groups;
}
