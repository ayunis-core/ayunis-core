import { baselineConsumer } from "./baseline-consumer.ts";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertReleaseCompatibility } from "./release-compatibility.ts";

const metadata = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  sdkCompatibility: { baselineVersion: string };
};
const baseline = metadata.sdkCompatibility.baselineVersion;
const probe = `
const assert = require('node:assert/strict');
const contracts = require('@ayunis-core/connect-sdk/contracts');
const client = require('@ayunis-core/connect-sdk/client');
const fixtures = require('@ayunis-core/connect-sdk/fixtures/core-webhooks.json');
assert.ok(fixtures.length > 0);
assert.ok(fixtures.every(fixture => contracts.parseWebhookEvent(fixture).ok));
assert.equal(typeof client.createCoreClient({ baseUrl: 'https://core.example/api', token: 'package-smoke' }).prepareExternalSubscription, 'function');
`;
const consumer = `
import { parseWebhookEvent } from '@ayunis-core/connect-sdk/contracts';
import { createCoreClient, type CoreCallOptions, type CoreApiResponse, type ExternalSubscriptionPreparationDto } from '@ayunis-core/connect-sdk/client';
const options: CoreCallOptions = { deliveryId: 'package-smoke' };
const client = createCoreClient({ baseUrl: 'https://core.example/api', token: 'package-smoke' });
const response: Promise<CoreApiResponse<ExternalSubscriptionPreparationDto>> = client.prepareExternalSubscription('organization-id', { mode: 'sync' }, options);
void response;
void parseWebhookEvent({});
`;
const fixtureCompatibility = `
const current = require('@ayunis-core/connect-sdk/contracts');
const previous = require('previous-core-sdk/contracts');
const currentFixtures = require('@ayunis-core/connect-sdk/fixtures/core-webhooks.json');
const previousFixtures = require('previous-core-sdk/fixtures/core-webhooks.json');
process.stdout.write(JSON.stringify({
  oldProducer: previousFixtures.every(f => current.parseWebhookEvent(f).ok),
  oldConsumer: currentFixtures.every(f => previous.parseWebhookEvent(f).ok)
}));
`;

function checkArchive(directory: string): string {
  const archives = readdirSync(directory).filter((name) =>
    name.endsWith(".tgz"),
  );
  if (archives.length !== 1)
    throw new Error("Expected exactly one SDK archive");
  return resolve(directory, archives[0]);
}

function installConsumers(cwd: string, archive: string): void {
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  writeFileSync(
    join(cwd, ".npmrc"),
    "@ayunis-core:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n",
  );
  execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- Fixed npm command for the developer CLI, without shell expansion.
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      archive,
      "zod@4.3.6",
      "typescript@5.8.2",
      `previous-core-sdk@npm:@ayunis-core/connect-sdk@${baseline}`,
    ],
    { cwd, stdio: "pipe" },
  );
}

function typecheck(cwd: string, filename: string) {
  return spawnSync(
    process.execPath,
    [
      join(cwd, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2023",
      filename,
    ],
    { cwd, encoding: "utf8" },
  );
}

function verifyCurrentConsumers(cwd: string): void {
  execFileSync(process.execPath, ["--input-type=commonjs", "--eval", probe], {
    cwd,
    stdio: "pipe",
  });
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `
import assert from 'node:assert/strict';
import { parseWebhookEvent } from '@ayunis-core/connect-sdk/contracts';
import { createCoreClient } from '@ayunis-core/connect-sdk/client';
assert.equal(parseWebhookEvent({}).ok, false);
assert.equal(typeof createCoreClient({ baseUrl: 'https://core.example/api', token: 'package-smoke' }).prepareExternalSubscription, 'function');
`,
    ],
    { cwd, stdio: "pipe" },
  );
  for (const filename of ["consumer.ts", "consumer.cts"]) {
    writeFileSync(join(cwd, filename), consumer);
    const result = typecheck(cwd, filename);
    if (result.status !== 0)
      throw new Error(
        `Packed consumer typecheck failed: ${result.stdout}${result.stderr}`,
      );
  }
}

function verifyPreviousRelease(cwd: string): void {
  const versions = JSON.parse(
    readFileSync(
      join(cwd, "node_modules/@ayunis-core/connect-sdk/package.json"),
      "utf8",
    ),
  ) as { version: string };
  const fixtures = JSON.parse(
    execFileSync(
      process.execPath,
      ["--input-type=commonjs", "--eval", fixtureCompatibility],
      { cwd, encoding: "utf8" },
    ),
  ) as { oldProducer: boolean; oldConsumer: boolean };
  writeFileSync(join(cwd, "legacy-consumer.ts"), baselineConsumer(cwd));
  const types = typecheck(cwd, "legacy-consumer.ts");
  if (types.error || types.status === null)
    throw new Error("Unable to run SDK compatibility compiler");
  const compatible =
    fixtures.oldProducer && fixtures.oldConsumer && types.status === 0;
  assertReleaseCompatibility(versions.version, baseline, compatible);
  process.stdout.write(
    `SDK ${versions.version} compared with ${baseline}: old producer=${fixtures.oldProducer}, old consumer=${fixtures.oldConsumer}, public types=${types.status === 0}.\n`,
  );
}

function verifyPackage(archive: string): void {
  const cwd = mkdtempSync(join(tmpdir(), "connect-sdk-package-"));
  try {
    installConsumers(cwd, archive);
    verifyCurrentConsumers(cwd);
    verifyPreviousRelease(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const directory = process.argv[2];
if (!directory) throw new Error("Usage: check-package.ts <archive-directory>");
verifyPackage(checkArchive(directory));
process.stdout.write(
  "Packed SDK module formats, minimum consumer compiler and release compatibility passed.\n",
);
