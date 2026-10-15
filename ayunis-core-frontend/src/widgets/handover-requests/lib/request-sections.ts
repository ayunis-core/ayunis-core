import type { HandoverRequest } from '@/features/resource-handover';

export interface RequestSection {
  key: string;
  teamName: string | null;
  requests: HandoverRequest[];
}

export function requestSections(
  requests: readonly HandoverRequest[],
): RequestSection[] {
  const sections = new Map<string, RequestSection>();
  for (const request of requests) {
    const key =
      request.target.type === 'org' ? 'org' : `team:${request.target.teamId}`;
    const section = sections.get(key) ?? {
      key,
      teamName:
        request.target.type === 'org' ? null : (request.target.teamName ?? ''),
      requests: [],
    };
    section.requests.push(request);
    sections.set(key, section);
  }
  return [...sections.values()].sort((left, right) => {
    if (left.teamName === null) return -1;
    if (right.teamName === null) return 1;
    return left.teamName.localeCompare(right.teamName);
  });
}
