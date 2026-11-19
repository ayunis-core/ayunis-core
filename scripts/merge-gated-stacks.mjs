// Merges open PRs that the PR gate cleared, whole stacks at a time, and posts
// what it merged or failed to merge to Slack. Run by
// .github/workflows/merge-gated-stacks.yml; the rules are in
// merge-gated-stacks-lib.mjs.
//
//   GH_TOKEN=... GITHUB_REPOSITORY=ayunis-core/ayunis-core DRY_RUN=true \
//     node scripts/merge-gated-stacks.mjs
import {
  OPEN_PULL_REQUESTS_QUERY,
  isWithinOfficeHours,
  runMergeJob,
} from "./merge-gated-stacks-lib.mjs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function createGitHubClient(token, repository) {
  const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const [owner, name] = repository.split("/");
  const repo = `repos/${owner}/${name}`;

  async function request(method, path, body) {
    const response = await fetch(`${apiUrl}/${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: parseBody(await response.text()) };
  }

  async function expectOk(method, path, body) {
    const response = await request(method, path, body);
    if (response.status >= 300) {
      throw new Error(
        `${method} ${path}: HTTP ${response.status} ${response.body?.message ?? ""}`,
      );
    }
    return response.body;
  }

  async function graphql(query, variables) {
    const result = await expectOk("POST", "graphql", { query, variables });
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join("; "));
    }
    return result.data;
  }

  return {
    async listOpenPullRequests() {
      const nodes = [];
      let cursor = null;
      let data;
      do {
        data = await graphql(OPEN_PULL_REQUESTS_QUERY, { owner, name, cursor });
        nodes.push(...data.repository.pullRequests.nodes);
        cursor = data.repository.pullRequests.pageInfo.endCursor;
      } while (data.repository.pullRequests.pageInfo.hasNextPage);
      data.repository.pullRequests.nodes = nodes;
      return data;
    },
    findStacks: (number) =>
      expectOk("GET", `${repo}/stacks?pull_request=${number}`),
    setStatus: (sha, status) =>
      expectOk("POST", `${repo}/statuses/${sha}`, status),
    mergeAsync: (number, sha) =>
      request("PUT", `${repo}/pulls/${number}/merge-async`, {
        sha,
        merge_method: "squash",
        merge_action: "direct_merge",
      }),
    getMergeResult: (number, uuid) =>
      expectOk("GET", `${repo}/pulls/${number}/merge-async/${uuid}`),
  };
}

function createSlackClient(webhookUrl) {
  return {
    async post(message) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        throw new Error(
          `Slack webhook: HTTP ${response.status} ${await response.text()}`,
        );
      }
    },
  };
}

async function main() {
  if (
    process.env.ENFORCE_OFFICE_HOURS === "true" &&
    !isWithinOfficeHours(new Date())
  ) {
    console.log("Outside Mon–Fri 08:00–18:00 Europe/Berlin, nothing to do");
    return;
  }
  const dryRun = process.env.DRY_RUN === "true";
  const repository = requireEnv("GITHUB_REPOSITORY");
  const github = createGitHubClient(requireEnv("GH_TOKEN"), repository);
  // Checked before anything merges, so no merge goes unreported.
  const slack = dryRun
    ? null
    : createSlackClient(requireEnv("SLACK_WEBHOOK_URL"));
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
  if (dryRun) console.log("Dry run: no statuses, merges or Slack posts");
  await runMergeJob({ github, slack, dryRun, runUrl });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
