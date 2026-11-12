Recordings
Meeting recordings owned by a user, a workspace, a team or the organization

A recording has a name, an organization (`orgId`), exactly one owner, the user who created it (`createdByUserId`, null once that user is deleted) and timestamps. Audio, transcript and summary follow in later steps of AYC-1648. The module is behind `FEATURE_RECORDINGS_ENABLED` (`recordingsEnabled`, off by default): with it off, every `/recordings` route returns 404, while the permissions, the data and the deletion listeners stay.

**Ownership.** The domain subclasses `PersonalRecording` (`userId`), `WorkspaceRecording` (`workspaceId`), `TeamRecording` (`teamId`) and `OrgRecording` form the `Recording` union; `CollectiveRecording` is team or org, `TransferableRecording` every owner but a workspace. Persistence uses the shared owner shape from `src/domain/ownership/`: `@SingleOwnerCheck('recordings')` (one of `userId`, `workspaceId`, `teamId` or `isOrgOwned`) and `whereCollectiveOwner` for team and org rows. `application/models/recording-owner.ts` aliases the shared `ResourceOwner` types and builds the recording for an owner (`recordingOwnedBy`), which create and owner change share.

**Access.** `RecordingAccessService` decides from the persisted owner, after checking the organization:

- Personal: only the owner reads and manages.
- Team and org: `CollectiveRecordingAccessService` (a `CollectiveResourceAccessService` with `manage_recordings`, `manage_team_recordings`, `manage_org_recordings`) applies the teams module's `GetCollectiveOwnerAccessUseCase`: members of the team or organization read; managing also takes `manage_recordings` plus the team permission as resolved for the user's team role, or the org permission.
- Workspace: the exported workspace read and write access use cases.

Unreadable recordings are `RECORDING_NOT_FOUND` (404); readable but unmanageable team and org recordings are forbidden (403). `requireCreate` is for recordings about to exist for, or move to, an owner: an unmanageable team or organization is forbidden rather than hidden. Every managing route also requires `manage_recordings` (`@RequirePermission`).

**Use cases.** `CreateRecordingUseCase` (any owner), `ListRecordingsUseCase` (personal scope: the user's own plus readable team and org recordings in one query; workspace scope: one workspace after read access), `FindRecordingUseCase`, `RenameRecordingUseCase`, `ChangeRecordingOwnerUseCase` and `DeleteRecordingUseCase`. List and find return the creator's name (`RecordingCreatorNameService`, through the users module). Rename, owner change and delete lock the row. An owner change moves between the caller, a team and the organization, needs the right to manage both owners, keeps id, creator and creation date, and rejects workspace recordings with `RECORDING_OWNER_CHANGE_NOT_ALLOWED` (only after access is checked).

**Deletion.** Rows go with their owner by FK cascade: deleting a user deletes their personal recordings and, with the workspaces they own, those workspaces' recordings; team and org recordings they created stay with `createdByUserId` set to null. Deleting a team, workspace or organization deletes its recordings. `RecordingCleanupService` is where every deletion path ends: `DeleteRecordingUseCase` calls it after its commit, and the user, team, workspace and organization deletion listeners snapshot the affected recordings before the cascade and defer it until the owner's row is gone. It has nothing outside the database to remove yet; audio and index cleanup belong there. Listener failures are logged and never block the deletion.

**HTTP.** `RecordingsController` at `/recordings`: `POST /` (`ownerType` `personal`, `workspace` with `workspaceId`, `team` with `teamId`, or `org`), `GET /?ownerType=personal|workspace[&workspaceId=]`, `GET /:id`, `PATCH /:id` (rename), `PATCH /:id/owner` (`personal`, `team` with `teamId`, or `org`) and `DELETE /:id`. Responses carry `ownerType`, `workspaceId` or `teamId`, `creatorName` and timestamps.

**Wiring.** `RecordingsModule` imports `LocalRecordingRepositoryModule`, `ContextModule`, `TeamsApplicationModule`, `UsersModule` and `WorkspacesModule`. `local-recording.repository.integration.spec.ts` runs the real migrations and proves the access query, the single-owner check, the deletion cascades and the permission backfill.
