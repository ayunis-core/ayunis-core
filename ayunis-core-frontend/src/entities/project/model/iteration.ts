import { CURRENT_USER, type MockProject } from './mock';

export type IterationLevel = 1 | 2 | 3 | 4 | 5;

export const ITERATION: IterationLevel = 5;

const level: number = ITERATION;

export const FEATURES = {
  skillsAndKnowledge: level >= 2,
  artifacts: level >= 3,
  sharing: level >= 4,
  settings: level >= 5,
};

export function applyIterationToList(list: MockProject[]): MockProject[] {
  const visible = FEATURES.sharing
    ? list
    : list.filter((project) => project.ownerId === CURRENT_USER.id);
  return visible.map(applyIteration);
}

function applyIteration(project: MockProject): MockProject {
  return {
    ...project,
    skills: FEATURES.skillsAndKnowledge ? project.skills : [],
    knowledgeBases: FEATURES.skillsAndKnowledge ? project.knowledgeBases : [],
    documents: FEATURES.skillsAndKnowledge ? project.documents : [],
    instructions: FEATURES.skillsAndKnowledge
      ? project.instructions
      : undefined,
    prompt: FEATURES.skillsAndKnowledge ? project.prompt : undefined,
    generatedDocuments: FEATURES.artifacts ? project.generatedDocuments : [],
    visibility: FEATURES.sharing ? project.visibility : 'private',
    teams: FEATURES.sharing ? project.teams : [],
    collaborators: FEATURES.sharing
      ? project.collaborators
      : project.collaborators.filter((c) => c.id === project.ownerId),
  };
}
