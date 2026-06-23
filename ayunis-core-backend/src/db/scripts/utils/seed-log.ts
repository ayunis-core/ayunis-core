/* eslint-disable no-console */
export function log(entity: string, name: string, created: boolean): void {
  const icon = created ? '✅' : '⏭️ ';
  const verb = created ? 'Created' : 'Exists';
  console.log(`${icon} ${verb}: ${entity} (${name})`);
}

export function logLine(message: string): void {
  console.log(message);
}
