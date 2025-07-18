import type {
  CreateInviteDto,
  CreateInviteDtoRole,
  InviteResponseDto,
  UpdateUserRoleDtoRole,
  UserResponseDto,
} from "@/shared/api";

export type InviteCreateData = CreateInviteDto;
export type Invite = InviteResponseDto;
export type InviteRole = CreateInviteDtoRole;
export type User = UserResponseDto;
export type UserRole = UpdateUserRoleDtoRole;
