import { useNavigate } from '@tanstack/react-router';
import { Building2, Search } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import type {
  Person,
  PrototypeSkill,
} from '@/widgets/sharing-prototype/model/types';
import {
  sharedSections,
  sharedSkillLabel,
} from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { EmptyHint } from './EmptyHint';
import { SkillListRow } from './SkillListRow';
import { SkillPanelSection } from './SkillPanelSection';
import { SkillStarterCard } from './SkillStarterCard';

function SkillRows({
  skills,
  labelOf,
}: Readonly<{
  skills: PrototypeSkill[];
  labelOf?: (skill: PrototypeSkill) => string | null;
}>) {
  const navigate = useNavigate();
  return (
    <>
      {skills.map((skill) => (
        <SkillListRow
          key={skill.id}
          skill={skill}
          label={labelOf?.(skill) ?? null}
          onOpen={() =>
            void navigate({ to: '/skills/$id', params: { id: skill.id } })
          }
        />
      ))}
    </>
  );
}

export function OwnSkills({
  skills,
  query,
}: Readonly<{ skills: PrototypeSkill[]; query: string }>) {
  if (skills.length === 0) {
    return query ? (
      <EmptyHint icon={<Search />} title="Keine Fähigkeit gefunden" />
    ) : (
      <SkillStarterCard />
    );
  }
  return (
    <ItemGroup className="gap-2">
      <SkillRows skills={skills} />
    </ItemGroup>
  );
}

export function SharedSkills({
  skills,
  person,
  query,
}: Readonly<{ skills: PrototypeSkill[]; person: Person; query: string }>) {
  const groups = sharedSections(skills, person);

  if (groups.length === 0) {
    return (
      <EmptyHint
        icon={query ? <Search /> : <Building2 />}
        title={
          query
            ? 'Keine Fähigkeit gefunden'
            : 'Noch nichts von Team oder Organisation'
        }
        description={
          query
            ? undefined
            : 'Hier erscheinen Fähigkeiten, die Ihrem Team oder der Organisation gehören.'
        }
      />
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((entry) => (
        <SkillPanelSection
          key={entry.key}
          title={entry.title}
          count={entry.skills.length}
        >
          <SkillRows
            skills={entry.skills}
            labelOf={(skill) => sharedSkillLabel(skill, person)}
          />
        </SkillPanelSection>
      ))}
    </div>
  );
}
