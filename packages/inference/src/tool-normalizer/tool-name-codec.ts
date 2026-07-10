import type { ToolSchema } from '../tool-schema';

// The strictest provider rules: Anthropic/OpenAI charset, OpenAI's 64-char cap.
const WIRE_NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_WIRE_NAME_LENGTH = 64;
const HASH_LENGTH = 6;
const HASH_SUFFIX_LENGTH = 1 + HASH_LENGTH;

// Bidirectional per-request codec between canonical tool names and the
// provider-safe names presented on the wire. Deterministic and
// order-independent: safe names always keep their exact name, transformed
// names are resolved in sorted order with collision probing, so the same
// tool set always yields the same unique mapping (stored conversations
// replay consistently).
export class ToolNameCodec {
  private readonly wireByCanonical = new Map<string, string>();
  private readonly canonicalByWire = new Map<string, string>();

  constructor(tools: readonly ToolSchema[]) {
    const names = unique(tools.map((tool) => tool.name));
    const unsafeNames = names.filter((name) => !isWireSafe(name));
    const unsafeBaseCounts = countBy(unsafeNames, toWireSafeName);

    // Safe names are never renamed — they claim their exact name first, so
    // stored conversations that carry them keep matching across requests.
    for (const name of names.filter(isWireSafe)) {
      this.claim(name, name);
    }

    for (const name of unsafeNames.toSorted(compareCodeUnit)) {
      this.claim(name, this.resolveDeclaredName(name, unsafeBaseCounts));
    }
  }

  encode(canonical: string): string {
    return (
      this.wireByCanonical.get(canonical) ??
      this.resolveHistoricalName(canonical)
    );
  }

  decode(wire: string): string {
    return this.canonicalByWire.get(wire) ?? wire;
  }

  private resolveDeclaredName(
    canonical: string,
    unsafeBaseCounts: ReadonlyMap<string, number>,
  ): string {
    const base = toWireSafeName(canonical);
    const needsSuffix =
      (unsafeBaseCounts.get(base) ?? 0) > 1 || this.canonicalByWire.has(base);
    const preferred = needsSuffix ? addHashSuffix(base, canonical, 0) : base;

    return this.firstFreeName(preferred, base, canonical);
  }

  // A name absent from the map belongs to a tool detached mid-conversation.
  // Safe names pass through untouched; unsafe names are sanitized — but
  // never onto a declared tool's wire name, which would misattribute the
  // call. The result is claimed so decode can reverse it and later departed
  // names cannot land on the same wire name.
  private resolveHistoricalName(canonical: string): string {
    if (isWireSafe(canonical)) {
      return canonical;
    }

    const base = toWireSafeName(canonical);
    const preferred = this.canonicalByWire.has(base)
      ? addHashSuffix(base, canonical, 0)
      : base;

    const wire = this.firstFreeName(preferred, base, canonical);
    this.claim(canonical, wire);
    return wire;
  }

  private firstFreeName(
    preferred: string,
    base: string,
    canonical: string,
  ): string {
    let candidate = preferred;
    let attempt = 0;

    while (this.canonicalByWire.has(candidate)) {
      attempt += 1;
      candidate = addHashSuffix(base, canonical, attempt);
    }

    return candidate;
  }

  private claim(canonical: string, wire: string): void {
    this.wireByCanonical.set(canonical, wire);
    this.canonicalByWire.set(wire, canonical);
  }
}

function isWireSafe(name: string): boolean {
  return WIRE_NAME_RE.test(name);
}

function toWireSafeName(name: string): string {
  const safe = name
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, MAX_WIRE_NAME_LENGTH);
  return /[A-Za-z0-9]/.test(safe) ? safe : `tool_${hash(name)}`;
}

// Hash of the canonical name disambiguates (canonicals are unique per
// request); `attempt` extends the input when a hash itself is contested.
function addHashSuffix(
  base: string,
  canonical: string,
  attempt: number,
): string {
  const seed = attempt === 0 ? canonical : `${canonical}#${attempt}`;
  const suffix = `_${hash(seed)}`;

  return `${base.slice(0, MAX_WIRE_NAME_LENGTH - HASH_SUFFIX_LENGTH)}${suffix}`;
}

// Code-unit comparison, not locale-dependent localeCompare — determinism
// must hold across platforms.
function compareCodeUnit(a: string, b: string): number {
  // eslint-disable-next-line sonarjs/no-nested-conditional
  return a < b ? -1 : a > b ? 1 : 0;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function countBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

// FNV-1a 32-bit, base36 — stable across runs and platforms.
function hash(input: string): string {
  let value = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }

  return value.toString(36).padStart(HASH_LENGTH, '0').slice(0, HASH_LENGTH);
}
