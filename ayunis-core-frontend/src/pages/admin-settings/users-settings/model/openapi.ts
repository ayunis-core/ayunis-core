import type {
  CreateInviteDto,
  CreateInviteDtoRole,
  InviteListItemResponseDto,
  UpdateUserRoleDtoRole,
  UserResponseDto,
} from '@ayunis/api-client';

export type InviteCreateData = CreateInviteDto;
export type Invite = InviteListItemResponseDto;
export type InviteRole = CreateInviteDtoRole;
export type User = UserResponseDto;
export type UserRole = UpdateUserRoleDtoRole;
