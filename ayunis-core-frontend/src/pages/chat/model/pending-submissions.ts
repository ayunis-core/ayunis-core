export interface ThreadSubmission {
  text: string;
  images?: File[];
}

const pendingSubmissions = new Map<string, string>();
const activeSubmissions = new Map<string, ThreadSubmission>();
const failedSubmissions = new Map<string, ThreadSubmission>();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function startThreadSubmission(
  threadId: string,
  submission: ThreadSubmission,
): void {
  activeSubmissions.set(threadId, submission);
  failedSubmissions.delete(threadId);
  pendingSubmissions.set(threadId, submission.text);
  notifyListeners();
}

export function clearPendingThreadSubmission(threadId: string): void {
  if (!pendingSubmissions.delete(threadId)) return;
  notifyListeners();
}

export function completeThreadSubmission(
  threadId: string,
  failed: boolean,
): void {
  const submission = activeSubmissions.get(threadId);
  if (failed && submission) failedSubmissions.set(threadId, submission);
  activeSubmissions.delete(threadId);
  pendingSubmissions.delete(threadId);
  notifyListeners();
}

export function resetThreadSubmission(threadId: string): void {
  activeSubmissions.delete(threadId);
  failedSubmissions.delete(threadId);
  pendingSubmissions.delete(threadId);
  notifyListeners();
}

export function getPendingThreadSubmission(threadId: string): string | null {
  return pendingSubmissions.get(threadId) ?? null;
}

export function getFailedThreadSubmission(
  threadId: string,
): ThreadSubmission | null {
  return failedSubmissions.get(threadId) ?? null;
}

export function consumeFailedThreadSubmission(
  threadId: string,
): ThreadSubmission | null {
  const submission = failedSubmissions.get(threadId) ?? null;
  if (!submission) return null;
  failedSubmissions.delete(threadId);
  notifyListeners();
  return submission;
}

export function subscribeToThreadSubmissions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
