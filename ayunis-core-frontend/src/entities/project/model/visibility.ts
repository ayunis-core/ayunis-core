import { CURRENT_USER, type MockProject } from './mock';

export function isPrivateProject(project: MockProject) {
  return (
    project.ownerId === CURRENT_USER.id &&
    project.visibility === 'private' &&
    project.collaborators.length <= 1 &&
    project.teams.length === 0
  );
}
