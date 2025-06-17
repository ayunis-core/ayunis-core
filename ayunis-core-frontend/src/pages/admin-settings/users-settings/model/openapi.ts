import type {
  CreateInviteDto,
  CreateInviteResponseDto,
  CreateInviteDtoRole,
  InviteResponseDto,
  UpdateUserRoleDtoRole,
  UserResponseDto,
} from "@/shared/api";

export type InviteCreateData = CreateInviteDto;
export type InviteCreateResponse = CreateInviteResponseDto;
export type Invite = InviteResponseDto;
export type InviteRole = CreateInviteDtoRole;
export type User = UserResponseDto;
export type UserRole = UpdateUserRoleDtoRole;
