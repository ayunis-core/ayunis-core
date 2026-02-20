import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum TeamMemberErrorCode {
  TEAM_MEMBER_NOT_FOUND = 'TEAM_MEMBER_NOT_FOUND',
  USER_ALREADY_TEAM_MEMBER = 'USER_ALREADY_TEAM_MEMBER',
  USER_NOT_IN_SAME_ORG = 'USER_NOT_IN_SAME_ORG',
  UNEXPECTED_TEAM_MEMBER_ERROR = 'UNEXPECTED_TEAM_MEMBER_ERROR',
}

export abstract class TeamMemberError extends ApplicationError {
  constructor(
    message: string,
    code: TeamMemberErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class TeamMemberNotFoundError extends TeamMemberError {
  constructor(teamId: string, userId: string, metadata?: ErrorMetadata) {
    super(
      `User '${userId}' is not a member of team '${teamId}'`,
      TeamMemberErrorCode.TEAM_MEMBER_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class UserAlreadyTeamMemberError extends TeamMemberError {
  constructor(teamId: string, userId: string, metadata?: ErrorMetadata) {
    super(
      `User '${userId}' is already a member of team '${teamId}'`,
      TeamMemberErrorCode.USER_ALREADY_TEAM_MEMBER,
      409,
      metadata,
    );
  }
}

export class UserNotInSameOrgError extends TeamMemberError {
  constructor(userId: string, metadata?: ErrorMetadata) {
    super(
      `User '${userId}' is not in the same organization as the team`,
      TeamMemberErrorCode.USER_NOT_IN_SAME_ORG,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an unexpected error occurs
 */
export class UnexpectedTeamMemberError extends TeamMemberError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      TeamMemberErrorCode.UNEXPECTED_TEAM_MEMBER_ERROR,
      500,
      { error },
    );
  }
}
