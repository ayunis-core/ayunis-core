export function handleCliError(error: Error): void {
  process.stderr.write(`${error.name}: ${error.message}\n`);
  process.exitCode = 1;
}
