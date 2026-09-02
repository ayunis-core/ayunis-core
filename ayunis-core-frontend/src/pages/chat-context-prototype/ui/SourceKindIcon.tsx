import { AlertCircle, AudioLines, FileText, Globe, Table2 } from 'lucide-react';
import {
  isAudio,
  isTabular,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';

export function SourceKindIcon({ hit }: Readonly<{ hit: SourceHit }>) {
  if (hit.status === 'failed') return <AlertCircle />;
  if (hit.kind === 'web') return <Globe />;
  if (isTabular(hit)) return <Table2 />;
  if (isAudio(hit)) return <AudioLines />;
  return <FileText />;
}
