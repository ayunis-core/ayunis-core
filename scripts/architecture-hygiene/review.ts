#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Verdict =
  | 'abstraction-candidate'
  | 'acceptable-duplication'
  | 'ignore'
  | 'infrastructure-leakage'
  | 'over-abstraction-candidate'
  | 'wait-for-third-use';

type Signal = {
  kind: string;
  severity: string;
  summary: string;
  locations: string[];
};

type SignalsReport = {
  commit: string;
  generatedAt: string;
  signals: Signal[];
};

type Finding = {
  verdict: Verdict;
  priority: string;
  title: string;
  evidence: string[];
  reason: string;
  recommendation: string;
};

const inputPath = process.argv[2] ?? 'architecture-hygiene/signals.json';
const outputDir = process.argv[3] ?? 'architecture-hygiene';
const findingsPath = path.join(outputDir, 'findings.json');
const reportPath = path.join(outputDir, 'report.md');
const signals = JSON.parse(readFileSync(inputPath, 'utf8')) as SignalsReport;
const policy = readFileSync('docs/engineering/abstraction-policy.md', 'utf8');
const allowedVerdicts = new Set<Verdict>([
  'ignore',
  'acceptable-duplication',
  'wait-for-third-use',
  'abstraction-candidate',
  'over-abstraction-candidate',
  'infrastructure-leakage',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeVerdict(value: unknown): Verdict {
  if (typeof value !== 'string' || !allowedVerdicts.has(value as Verdict)) {
    throw new Error(`AI review returned unsupported verdict: ${String(value)}`);
  }
  return value as Verdict;
}

function normalizeFinding(value: unknown): Finding {
  if (!isRecord(value)) {
    throw new Error('AI review finding must be an object');
  }
  if (!Array.isArray(value.evidence)) {
    throw new Error('AI review finding evidence must be an array');
  }
  return {
    verdict: normalizeVerdict(value.verdict),
    priority: String(value.priority ?? 'low'),
    title: String(value.title ?? 'Untitled finding'),
    evidence: value.evidence.map((item) => String(item)),
    reason: String(value.reason ?? 'No reason provided'),
    recommendation: String(value.recommendation ?? 'Review manually'),
  };
}

function deterministicFindings(): Finding[] {
  return signals.signals.map((signal) => {
    if (signal.kind === 'infrastructure-import') {
      return {
        verdict: 'infrastructure-leakage',
        priority: 'medium',
        title: signal.summary,
        evidence: signal.locations,
        reason: 'Application/domain code should not depend directly on infrastructure packages.',
        recommendation: 'Inspect whether the dependency belongs behind a module adapter, Nest logger, or port.',
      };
    }
    if (signal.kind === 'large-file') {
      return {
        verdict: 'wait-for-third-use',
        priority: signal.severity,
        title: signal.summary,
        evidence: signal.locations,
        reason: 'Large files can hide multiple reasons to change, but size alone is not an abstraction signal.',
        recommendation: 'Review for separable helpers or module-local extraction before introducing shared abstractions.',
      };
    }
    return {
      verdict: 'acceptable-duplication',
      priority: signal.severity,
      title: signal.summary,
      evidence: signal.locations,
      reason: 'This signal needs human context to prove same reason to change.',
      recommendation: 'Apply the abstraction policy before creating a follow-up ticket.',
    };
  });
}

async function aiFindings(): Promise<Finding[] | null> {
  const apiKey = process.env.ARCHITECTURE_REVIEW_API_KEY;
  const endpoint = process.env.ARCHITECTURE_REVIEW_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.ARCHITECTURE_REVIEW_MODEL || 'gpt-4o-mini';
  if (!apiKey) {
    return null;
  }

  const prompt = `Classify architecture hygiene signals using this abstraction policy and only these verdict labels: ${[...allowedVerdicts].join(', ')}. Return JSON only with a findings array. Do not recommend abstraction unless locations share the same reason to change.\n\nPolicy:\n${policy}\n\nSignals:\n${JSON.stringify(signals, null, 2)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a conservative architecture hygiene reviewer.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    throw new Error(`AI review failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as unknown;
  const content = isRecord(body)
    ? (((body.choices as Record<string, unknown>[] | undefined)?.[0]?.message as Record<string, unknown> | undefined)
        ?.content as string | undefined)
    : undefined;
  if (!content) {
    throw new Error('AI review response did not include message content');
  }
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.findings)) {
    throw new Error('AI review response must contain a findings array');
  }
  const findings = parsed.findings.map(normalizeFinding);
  if (findings.length === 0 && signals.signals.length > 0) {
    throw new Error('AI review returned no findings for non-empty signals');
  }
  return findings;
}

function renderMarkdown(findings: Finding[], source: string): string {
  const rows = findings
    .map((finding) => `### ${finding.title}\n\n- Verdict: ${finding.verdict}\n- Priority: ${finding.priority}\n- Evidence: ${finding.evidence.join(', ')}\n- Reason: ${finding.reason}\n- Recommendation: ${finding.recommendation}\n`)
    .join('\n');
  return `# Architecture Hygiene Review\n\n- Commit: ${signals.commit}\n- Generated: ${signals.generatedAt}\n- Source: ${source}\n- Signals collected: ${signals.signals.length}\n- Findings: ${findings.length}\n\nThis report is advisory. Create Linear follow-up tickets only after human review.\n\n${rows || 'No findings.'}\n`;
}

mkdirSync(outputDir, { recursive: true });
let source = 'deterministic-fallback';
let findings: Finding[] | null | undefined;
try {
  findings = await aiFindings();
  if (findings) {
    source = 'ai';
  }
} catch (error) {
  console.warn(error instanceof Error ? error.message : error);
}
findings ??= deterministicFindings();
writeFileSync(findingsPath, `${JSON.stringify({ schemaVersion: 1, source, findings }, null, 2)}\n`);
writeFileSync(reportPath, renderMarkdown(findings, source));
console.log(`Wrote architecture hygiene review to ${reportPath}`);
