import { Link } from '@tanstack/react-router';
import { Database, Sparkles } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';
import {
  useKnowledgeBasesControllerFindAll,
  useSkillsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export function AvailabilityChips() {
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const { data: skills } = useSkillsControllerFindAll({
    query: { enabled: skillsEnabled },
  });
  const { data: knowledgeBases } = useKnowledgeBasesControllerFindAll({
    query: { enabled: knowledgeBasesEnabled },
  });

  const skillCount = skills?.length ?? 0;
  const knowledgeBaseCount = knowledgeBases?.data.length ?? 0;
  if (skillCount === 0 && knowledgeBaseCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {skillsEnabled && skillCount > 0 && (
        <Badge asChild variant="outline">
          <Link to="/skills">
            <Sparkles />
            {skillCount} Fähigkeiten
          </Link>
        </Badge>
      )}
      {knowledgeBasesEnabled && knowledgeBaseCount > 0 && (
        <Badge asChild variant="outline">
          <Link to="/knowledge-bases">
            <Database />
            {knowledgeBaseCount} Wissensdatenbanken
          </Link>
        </Badge>
      )}
    </div>
  );
}
