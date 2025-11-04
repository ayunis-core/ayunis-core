# TICKET-014: Update API Documentation and Regenerate Client

## Description

Update OpenAPI/Swagger documentation for the modified MCP integration endpoints and regenerate the frontend TypeScript client to reflect the new simplified authentication model.

## Acceptance Criteria

- [ ] Controller endpoints have updated `@ApiProperty()` decorators
- [ ] Swagger documentation reflects new auth types
- [ ] API examples updated for each auth method
- [ ] Response schemas include connection status fields
- [ ] Frontend client regenerated: `npm run openapi:update`
- [ ] Generated TypeScript types match new DTOs
- [ ] No breaking changes in existing frontend code
- [ ] Frontend can create integrations with new auth types
- [ ] Documentation clearly explains credential requirements

## Dependencies

- TICKET-010 (DTOs must be updated)
- TICKET-011 (Predefined registry must be complete)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

Steps:
1. Ensure backend is running with updated code
2. Run from frontend directory: `npm run openapi:update`
3. Review generated files in `ayunis-core-frontend/src/shared/api/generated/`
4. Update any frontend code if type changes require it
5. Test frontend integration creation flow