import { Badge } from '@ayunis/ui/components/badge';
import { Sparkles } from 'lucide-react';
import { PrototypeInput } from '@/pages/chat-context-prototype/ui/PrototypeInput';

const PINNED_SKILLS = [
  'Ratsvorlage erstellen',
  'Amtsdeutsch vereinfachen',
  'Protokoll zusammenfassen',
];

export function NewChatView() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-4">
      <div className="flex w-full max-w-[800px] flex-col gap-4">
        <h1 className="text-center text-2xl font-bold">
          Guten Morgen, Christian
        </h1>
        <PrototypeInput pendingIds={[]} />
        <div className="flex flex-wrap justify-center gap-1.5">
          {PINNED_SKILLS.map((name) => (
            <Badge key={name} variant="outline" className="cursor-pointer">
              <Sparkles className="text-brand" />
              {name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
