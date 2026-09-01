import { Link } from '@tanstack/react-router';
import { Database, Sparkles } from 'lucide-react';
import { Card } from '@ayunis/ui/components/card';
import {
  plural,
  type Availability,
} from '@/pages/chat-context-prototype/model/useAvailability';

export function AvailabilityBanner({
  availability,
}: Readonly<{ availability: Availability }>) {
  const { skills, knowledgeBases } = availability;
  return (
    <Card className="gap-2 p-4">
      <p className="text-sm">
        Ayunis Core arbeitet mit{' '}
        <span className="font-medium">
          {plural(skills.length, 'Fähigkeit', 'Fähigkeiten')}
        </span>{' '}
        und{' '}
        <span className="font-medium">
          {plural(
            knowledgeBases.length,
            'Wissensdatenbank',
            'Wissensdatenbanken',
          )}
        </span>
        .
      </p>
      <p className="text-xs text-muted-foreground">
        Fähigkeiten werden passend zu Ihrer Nachricht aktiviert,
        Wissensdatenbanken bei Bedarf durchsucht. Sie müssen nichts anhängen.
      </p>
      <div className="mt-1 flex gap-4 text-xs">
        <Link
          to="/skills"
          className="flex items-center gap-1.5 underline underline-offset-4 [&_svg]:size-3.5"
        >
          <Sparkles />
          Fähigkeiten
        </Link>
        <Link
          to="/knowledge-bases"
          className="flex items-center gap-1.5 underline underline-offset-4 [&_svg]:size-3.5"
        >
          <Database />
          Wissen
        </Link>
      </div>
    </Card>
  );
}
