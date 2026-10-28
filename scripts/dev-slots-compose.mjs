import path from "node:path";

const portBases = {
  POSTGRES_HOST_PORT: 5432,
  MINIO_HOST_PORT: 9000,
  MINIO_CONSOLE_HOST_PORT: 9001,
  MAILCATCHER_SMTP_HOST_PORT: 1025,
  MAILCATCHER_WEB_HOST_PORT: 1080,
  CODE_EXEC_HOST_PORT: 8080,
  ANONYMIZE_HOST_PORT: 8002,
  REDIS_HOST_PORT: 6379,
  GOTENBERG_HOST_PORT: 3100,
};

function slotEnvironment(slot) {
  const offset = slot * 10;
  return {
    ...Object.fromEntries(
    Object.entries(portBases).map(([name, base]) => [name, String(base + offset)]),
    ),
    MINIO_ROOT_USER: "placeholder",
    MINIO_ROOT_PASSWORD: "placeholder",
    REDIS_PASSWORD: "placeholder",
  };
}

export function composeDown({ record, run, deleteVolumes = false }) {
  const args = [
    "compose",
    "-f",
    path.join(record.worktree, "compose.dev.yml"),
    "-p",
    `ayunis-dev-${record.slot}`,
    "down",
  ];
  if (deleteVolumes) args.push("--volumes");
  return run("docker", args, {
    cwd: record.worktree,
    env: slotEnvironment(record.slot),
  });
}
