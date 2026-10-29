import ts from "typescript";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compatibilityAssignments } from "./baseline-consumer.js";

describe("published SDK export coverage", () => {
  it("includes every named public type and value, excluding private declarations", () => {
    const cwd = mkdtempSync(join(tmpdir(), "sdk-exports-test-"));
    try {
      const file = join(cwd, "index.d.ts");
      writeFileSync(
        file,
        `type PrivatePayload = string; type OrgPayload = {id:string}; declare const EVENT: 'org.created'; type EventPayload<T extends "one" | "two"> = {type:T}; export {OrgPayload, EVENT, EventPayload};`,
      );
      const consumer = compatibilityAssignments(file, "contracts");
      expect(consumer).toContain("contractsCurrent.OrgPayload");
      expect(consumer).toContain("typeof contractsCurrent.EVENT");
      expect(consumer).not.toContain("PrivatePayload");
      expect(consumer).toMatch(/EventPayload<.*one.*two/);
      const probe = join(cwd, "consumer.ts");
      writeFileSync(
        probe,
        `import * as contractsCurrent from './index'; import * as contractsPrevious from './index';\n${consumer}`,
      );
      const program = ts.createProgram([probe], {
        types: [],
        skipLibCheck: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      });
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
          ),
      ).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
