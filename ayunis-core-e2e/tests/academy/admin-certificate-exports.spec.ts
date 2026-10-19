import { readFile } from "node:fs/promises";
import { request as apiRequest } from "@playwright/test";
import type { APIRequestContext, Download } from "@playwright/test";
import { config } from "../../src/config";
import { test, expect } from "../../src/fixtures/test";
import { login } from "../../src/clients/api/auth.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  findOrgCertificateByEmail,
  requestCertificateOverviewExport,
  requestMemberCertificate,
} from "../../src/clients/api/academy-access.client";
import { createUser } from "../../src/factories/user.factory";
import { loginThroughUi } from "../../src/flows/auth.flow";
import { enableAcademyForOrg } from "../../src/clients/api/academy.client";
import { seedCertificateOverviewMembers } from "../../src/clients/database.client";
import { extractPdfText } from "../../src/assertions/pdf";

// The seeded "Usage Org" carries the academy add-on and completions in every
// certificate state; this spec only reads it, so it stays safe to share.
const SEEDED_ADMIN = { email: "admin@usage.local", password: "admin" };
const COMPLETED_MEMBER_EMAIL = "anna@usage.local";

const CSV_HEADER =
  '"Name","E-Mail","Status","Zuletzt abgeschlossen","Erneuerung fällig"';

async function loginSeededAdminApi(): Promise<APIRequestContext> {
  const api = await apiRequest.newContext({ baseURL: config.apiURL });
  await login(api, SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  return api;
}

async function readDownload(download: Download): Promise<Buffer> {
  return readFile(await download.path());
}

test.describe("seeded org admin", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("exports the filtered overview and downloads a member confirmation", async ({
    page,
  }) => {
    const seededApi = await loginSeededAdminApi();
    try {
      await dismissWelcomeVideo(seededApi);
      const completedMember = await findOrgCertificateByEmail(
        seededApi,
        COMPLETED_MEMBER_EMAIL,
      );
      const adminWithoutCompletion = await findOrgCertificateByEmail(
        seededApi,
        SEEDED_ADMIN.email,
      );

      await loginThroughUi(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password);
      await page.goto("/admin-settings/academy?search=anna");

      const csvDownload = page.waitForEvent("download");
      await page.getByTestId("academy-overview-export").click();
      const csvFile = await csvDownload;
      expect(csvFile.suggestedFilename()).toBe(
        "Schulungsstatus_Ayunis_Core_KI-Schulung.csv",
      );
      const csv = (await readDownload(csvFile)).toString("utf8");
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      const lines = csv.trim().split("\n");
      expect(lines[0]).toBe(CSV_HEADER);
      expect(lines.slice(1)).toHaveLength(1);
      expect(lines[1]).toContain(`"${COMPLETED_MEMBER_EMAIL}"`);
      expect(lines[1]).toContain('"Gültig"');

      const pdfDownload = page.waitForEvent("download");
      await page
        .getByTestId(`academy-certificate-download-${completedMember.userId}`)
        .click();
      const pdf = await pdfDownload;
      expect(pdf.suggestedFilename()).toBe(
        "Teilnahmebestaetigung_Ayunis_Core_KI-Schulung.pdf",
      );
      const pdfText = await extractPdfText(await readDownload(pdf));
      expect(pdfText).toContain(completedMember.name);
      expect(pdfText).toContain(
        new Intl.DateTimeFormat("de-DE", {
          timeZone: "Europe/Berlin",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(completedMember.completedAt!)),
      );
      expect(pdfText).not.toContain(adminWithoutCompletion.name);

      await page.goto(`/admin-settings/academy?search=${SEEDED_ADMIN.email}`);
      await expect(
        page.getByTestId(
          `academy-overview-row-${adminWithoutCompletion.userId}`,
        ),
      ).toBeVisible();
      await expect(
        page.getByTestId(
          `academy-certificate-download-${adminWithoutCompletion.userId}`,
        ),
      ).toHaveCount(0);
    } finally {
      await seededApi.dispose();
    }
  });
});

test("only an admin of the member's own org can download the confirmation", async ({
  api,
  mail,
}) => {
  const seededApi = await loginSeededAdminApi();
  const memberApi = await apiRequest.newContext({ baseURL: config.apiURL });
  try {
    const completedMember = await findOrgCertificateByEmail(
      seededApi,
      COMPLETED_MEMBER_EMAIL,
    );

    // An admin of a different org gets "not a member", not the file.
    const crossOrg = await requestMemberCertificate(
      api,
      completedMember.userId,
    );
    expect(crossOrg.status()).toBe(404);

    // A regular member of the worker org reaches neither endpoint.
    const member = await createUser(api, mail, `cert-${Date.now()}`);
    await login(memberApi, member.email, member.password);
    expect((await requestCertificateOverviewExport(memberApi)).status()).toBe(
      403,
    );
    expect(
      (await requestMemberCertificate(memberApi, member.id)).status(),
    ).toBe(403);

    const allowed = await requestMemberCertificate(
      seededApi,
      completedMember.userId,
    );
    expect(allowed.status()).toBe(200);
    expect(allowed.headers()["content-type"]).toContain("application/pdf");
    expect((await allowed.body()).subarray(0, 4).toString()).toBe("%PDF");
  } finally {
    await seededApi.dispose();
    await memberApi.dispose();
  }
});

test("exports every matching member from a later page and excludes other tenants", async ({
  page,
  api,
  org,
}) => {
  await enableAcademyForOrg(org.orgId);
  const prefix = `academy-${Date.now()}`;
  const { members, excluded, unrelated } = await seedCertificateOverviewMembers(
    org.orgId,
    prefix,
  );
  await page.goto(
    `/admin-settings/academy?search=${prefix}&status=not_passed&page=2`,
  );
  await expect(
    page.getByTestId(`academy-overview-row-${members[25].id}`),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByTestId("academy-overview-export").click();
  const csv = (await readDownload(await pending)).toString("utf8");
  expect(csv.trim().split("\n").slice(1)).toHaveLength(26);
  for (const member of members) expect(csv).toContain(`"${member.email}"`);
  expect(csv).not.toContain(excluded.email);
  expect(csv).not.toContain(unrelated.email);
  expect(csv).not.toContain(COMPLETED_MEMBER_EMAIL);

  const foreignApi = await loginSeededAdminApi();
  try {
    const foreignExport = await requestCertificateOverviewExport(foreignApi, {
      search: prefix,
      status: "not_passed",
    });
    expect(foreignExport.status()).toBe(200);
    expect((await foreignExport.text()).trim()).toBe(CSV_HEADER);
    const ownExport = await requestCertificateOverviewExport(api, {
      search: prefix,
      status: "valid",
    });
    expect(ownExport.status()).toBe(200);
    const validCsv = await ownExport.text();
    expect(validCsv).toContain(excluded.email);
    expect(validCsv.trim().split("\n").slice(1)).toHaveLength(1);
  } finally {
    await foreignApi.dispose();
  }
});
