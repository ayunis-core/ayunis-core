import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';

export enum TeamPermittedModelErrorCode {
  CANNOT_DELETE_LAST_TEAM_MODEL = 'CANNOT_DELETE_LAST_TEAM_MODEL',
}

export class CannotDeleteLastTeamModelError extends ApplicationError {
  constructor(teamId: UUID) {
    super(
      `Cannot delete the last permitted language model of team '${teamId}' while it has model override enabled.`,
      TeamPermittedModelErrorCode.CANNOT_DELETE_LAST_TEAM_MODEL,
      400,
      { teamId },
    );
  }
}
