import type { ProjectColor, ProjectIconKey } from './appearance';
import { useSyncExternalStore } from 'react';
import { initialProjects } from './initial-projects';
import type {
  MockProject,
  ProjectChat,
  ProjectCollaborator,
  ProjectDocument,
  ProjectKnowledgeBase,
  ProjectRole,
  ProjectSkill,
  ProjectTeam,
  ProjectVisibility,
} from './mock';

let projects: MockProject[] = initialProjects;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProjects(): MockProject[] {
  return useSyncExternalStore(subscribe, () => projects);
}

export function addProject(project: MockProject) {
  projects = [...projects, project];
  emit();
}

function updateProject(
  id: string,
  updater: (project: MockProject) => MockProject,
) {
  projects = projects.map((p) =>
    p.id === id ? { ...updater(p), updatedAt: new Date().toISOString() } : p,
  );
  emit();
}

export function addSkillsToProject(projectId: string, skills: ProjectSkill[]) {
  updateProject(projectId, (p) => ({ ...p, skills: [...p.skills, ...skills] }));
}

export function addKnowledgeBasesToProject(
  projectId: string,
  knowledgeBases: ProjectKnowledgeBase[],
) {
  updateProject(projectId, (p) => ({
    ...p,
    knowledgeBases: [...p.knowledgeBases, ...knowledgeBases],
  }));
}

export function addDocumentToProject(
  projectId: string,
  document: ProjectDocument,
) {
  updateProject(projectId, (p) => ({
    ...p,
    documents: [...p.documents, document],
  }));
}

export function addChatToProject(projectId: string, chat: ProjectChat) {
  updateProject(projectId, (p) => ({ ...p, chats: [chat, ...p.chats] }));
}

export function removeSkillFromProject(projectId: string, skillId: string) {
  updateProject(projectId, (p) => ({
    ...p,
    skills: p.skills.filter((s) => s.id !== skillId),
  }));
}

export function removeKnowledgeBaseFromProject(
  projectId: string,
  knowledgeBaseId: string,
) {
  updateProject(projectId, (p) => ({
    ...p,
    knowledgeBases: p.knowledgeBases.filter((k) => k.id !== knowledgeBaseId),
  }));
}

export function removeDocumentFromProject(
  projectId: string,
  documentId: string,
) {
  updateProject(projectId, (p) => ({
    ...p,
    documents: p.documents.filter((d) => d.id !== documentId),
  }));
}

export function toggleGeneratedDocumentShared(
  projectId: string,
  documentId: string,
) {
  updateProject(projectId, (p) => ({
    ...p,
    generatedDocuments: (p.generatedDocuments ?? []).map((d) =>
      d.id === documentId ? { ...d, shared: !d.shared } : d,
    ),
  }));
}

export function removeGeneratedDocument(projectId: string, documentId: string) {
  updateProject(projectId, (p) => ({
    ...p,
    generatedDocuments: (p.generatedDocuments ?? []).filter(
      (d) => d.id !== documentId,
    ),
  }));
}

export function toggleChatPinned(projectId: string, chatId: string) {
  updateProject(projectId, (p) => ({
    ...p,
    chats: p.chats.map((c) =>
      c.id === chatId ? { ...c, pinned: !c.pinned } : c,
    ),
  }));
}

export function removeChatFromProject(projectId: string, chatId: string) {
  updateProject(projectId, (p) => ({
    ...p,
    chats: p.chats.filter((c) => c.id !== chatId),
  }));
}

export function updateProjectDetails(
  projectId: string,
  details: {
    name: string;
    icon: ProjectIconKey;
    color: ProjectColor;
    instructions?: string;
    prompt?: string;
  },
) {
  updateProject(projectId, (p) => ({ ...p, ...details }));
}

export function updateProjectPrompt(projectId: string, prompt: string) {
  updateProject(projectId, (p) => ({
    ...p,
    prompt: prompt.trim() || undefined,
  }));
}

export function updateProjectSettings(
  projectId: string,
  settings: Partial<
    Pick<
      MockProject,
      | 'allowMemberContent'
      | 'allowPrivateChats'
      | 'allowContentSharing'
      | 'autoDeleteDays'
      | 'enforceAnonymization'
    >
  >,
) {
  updateProject(projectId, (p) => ({ ...p, ...settings }));
}

export function setProjectVisibility(
  projectId: string,
  visibility: ProjectVisibility,
) {
  updateProject(projectId, (p) => ({ ...p, visibility }));
}

export function reorderProjects(activeId: string, overId: string) {
  const fromIndex = projects.findIndex((p) => p.id === activeId);
  const toIndex = projects.findIndex((p) => p.id === overId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
  const next = [...projects];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  projects = next;
  emit();
}

export function moveProjectInSidebar(
  projectId: string,
  direction: 'up' | 'down',
) {
  const starredIds = projects.filter((p) => p.starred).map((p) => p.id);
  const position = starredIds.indexOf(projectId);
  if (position === -1) return;
  const targetId = starredIds[direction === 'up' ? position - 1 : position + 1];
  if (!targetId) return;
  reorderProjects(projectId, targetId);
}

export function removeProject(projectId: string) {
  projects = projects.filter((p) => p.id !== projectId);
  emit();
}

export function toggleProjectStarred(projectId: string) {
  updateProject(projectId, (p) => ({ ...p, starred: !p.starred }));
}

export function addCollaboratorToProject(
  projectId: string,
  collaborator: ProjectCollaborator,
) {
  updateProject(projectId, (p) => ({
    ...p,
    collaborators: [...p.collaborators, collaborator],
  }));
}

export function updateCollaboratorRole(
  projectId: string,
  collaboratorId: string,
  role: ProjectRole,
) {
  updateProject(projectId, (p) => ({
    ...p,
    collaborators: p.collaborators.map((c) =>
      c.id === collaboratorId ? { ...c, role } : c,
    ),
  }));
}

export function removeCollaboratorFromProject(
  projectId: string,
  collaboratorId: string,
) {
  updateProject(projectId, (p) => ({
    ...p,
    collaborators: p.collaborators.filter((c) => c.id !== collaboratorId),
  }));
}

export function setTeamMemberOverride(
  projectId: string,
  person: Omit<ProjectCollaborator, 'role'>,
  override: { role: ProjectRole; blocked?: boolean } | null,
) {
  updateProject(projectId, (p) => {
    const others = p.collaborators.filter((c) => c.id !== person.id);
    if (override === null) {
      return { ...p, collaborators: others };
    }
    return {
      ...p,
      collaborators: [
        ...others,
        {
          id: person.id,
          name: person.name,
          initials: person.initials,
          email: person.email,
          role: override.role,
          blocked: override.blocked,
        },
      ],
    };
  });
}

export function addTeamToProject(projectId: string, team: ProjectTeam) {
  updateProject(projectId, (p) => ({ ...p, teams: [...p.teams, team] }));
}

export function updateTeamRole(
  projectId: string,
  teamId: string,
  role: ProjectRole,
) {
  updateProject(projectId, (p) => ({
    ...p,
    teams: p.teams.map((t) => (t.id === teamId ? { ...t, role } : t)),
  }));
}

export function removeTeamFromProject(projectId: string, teamId: string) {
  updateProject(projectId, (p) => ({
    ...p,
    teams: p.teams.filter((t) => t.id !== teamId),
  }));
}
