/**
 * Explicit, per-run key/value bag threaded through every hook and tool
 * execution. Replaces implicit request-context mechanisms (e.g. CLS) in
 * hosts. The runtime core never reads it — only host-written hooks and
 * tools do, which is what keeps multi-tenancy out of the core.
 *
 * Reads fall through to the parent context (a subagent inherits identity
 * like orgId/userId); writes stay local (a child's state never pollutes
 * the parent).
 */
export class RunContext {
  readonly runId: string;
  readonly depth: number;
  readonly path: readonly string[];

  private readonly values = new Map<string | symbol, unknown>();
  private readonly parent?: RunContext;

  private constructor(parent?: RunContext) {
    this.runId = crypto.randomUUID();
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
    this.path = parent ? [...parent.path, this.runId] : [this.runId];
  }

  static create(initial?: Record<string, unknown>): RunContext {
    const context = new RunContext();
    if (initial) {
      for (const [key, value] of Object.entries(initial)) {
        context.set(key, value);
      }
    }
    return context;
  }

  get<T>(key: string | symbol): T | undefined {
    if (this.values.has(key)) {
      return this.values.get(key) as T;
    }
    return this.parent?.get<T>(key);
  }

  has(key: string | symbol): boolean {
    return this.values.has(key) || (this.parent?.has(key) ?? false);
  }

  set<T>(key: string | symbol, value: T): void {
    this.values.set(key, value);
  }

  /**
   * Reserved subagent seam: derives a child context that inherits this
   * context's values via read-through while keeping its own writes local.
   */
  deriveChild(): RunContext {
    return new RunContext(this);
  }
}
