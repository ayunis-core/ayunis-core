import { Database, FileText, Plug, Sparkles } from 'lucide-react';
import type { ContextKind } from '@/pages/chat-context-prototype/model/mock';

export function ContextKindIcon({ kind }: Readonly<{ kind: ContextKind }>) {
  if (kind === 'skill') return <Sparkles />;
  if (kind === 'knowledgeBase') return <Database />;
  if (kind === 'integration') return <Plug />;
  return <FileText />;
}
