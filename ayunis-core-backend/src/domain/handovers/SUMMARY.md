# Handovers Module

## Purpose

Lets people hand their own skill or knowledge base over to a team or the organisation. A reviewer approves or rejects the request; after approval the item belongs to the target and records who submitted it.

## Rules

`HandoverPolicy` decides from the caller's `OwnershipViewer`:

| Target       | May request                                             | May review                                                                   |
| ------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Own team     | `request_skill_transfer` / `request_knowledge_transfer` | Admins, `review_all_*`, team admins of that team with `team_review_requests` |
| Other team   | `request_*_other_teams`                                 | Same                                                                         |
| Organisation | `request_*_org`                                         | Admins and `review_all_*`                                                    |

- Only the personal owner can hand an item over. When the caller may review the target, the handover applies at once (a request is stored as approved); otherwise a pending request is created.
- One pending request per item (`UQ_handover_requests_pending_skill`, `UQ_handover_requests_pending_knowledge_base`).
- Approve, reject and withdraw use a guarded update (`WHERE status = 'pending'`); a second decision gets 409 `HANDOVER_NOT_PENDING`. Only the requester can withdraw. Every decision is checked against the request's organisation.
- Approval calls the skills and knowledge-bases modules (`TransferSkillOwnershipUseCase`, `TransferKnowledgeBaseOwnershipUseCase`), which move the item to the target, set `submittedByUserId`, unlink a skill's knowledge bases and MCP integrations, check the name at the target (409 `NAME_TAKEN_AT_TARGET`) and keep the requester's active state.
- Decided requests stay as history. Deleting the item, the requester or the target team removes its requests (cascades).
- While a request is pending, its reviewers may view the item read-only: `IsHandoverReviewerUseCase` backs `requireView` in the skills and knowledge-bases read services. It never grants use or activation.

## API

| Method | Path                                                   | Description                                                                                                |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/handover-requests/targets?resourceType=`             | Teams and organisation the caller may hand over to, with member counts, reviewers and `appliesImmediately` |
| POST   | `/handover-requests`                                   | Hand over or request (`resourceType`, `resourceId`, `targetType`, `targetTeamId`)                          |
| GET    | `/handover-requests?resourceType=`                     | Open requests the caller may review, oldest first                                                          |
| GET    | `/handover-requests/summary`                           | Review rights and open counts per resource type                                                            |
| GET    | `/handover-requests/pending?resourceType=&resourceId=` | The open request of one item, for its requester or reviewers                                               |
| POST   | `/handover-requests/:id/approve`                       | Approve                                                                                                    |
| POST   | `/handover-requests/:id/reject`                        | Reject                                                                                                     |
| DELETE | `/handover-requests/:id`                               | Withdraw                                                                                                   |
