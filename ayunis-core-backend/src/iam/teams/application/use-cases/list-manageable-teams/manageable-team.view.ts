import type { TeamWithAdmins } from 'src/iam/teams/application/use-cases/get-manageable-team/team-with-admins.view';
import type { TeamWithMemberCount } from 'src/iam/teams/application/use-cases/list-teams/team-with-member-count.view';

export interface ManageableTeam extends TeamWithMemberCount, TeamWithAdmins {}
