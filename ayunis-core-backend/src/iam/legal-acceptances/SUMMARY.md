Legal Compliance
Tracks user acceptance of terms of service and policies.

Records and verifies user acceptance of legal documents including Terms of Service and Privacy Policy. Supports versioned documents so acceptance can be re-required when legal text is updated.

This module ensures regulatory compliance by tracking which legal documents each user has accepted. The core entity is the abstract `LegalAcceptance` class with concrete variants `TosAcceptance` (Terms of Service) and `PrivacyPolicyAcceptance`, distinguished by the `LegalAcceptanceType` enum. Each acceptance records the user ID, org ID, document version, and timestamps. Key use cases are `CreateLegalAcceptanceUseCase` for recording a new acceptance and `HasAcceptedLatestVersionUseCase` for checking whether a user has accepted the current version of a given document type. It integrates with **authorization** via the `EmailConfirmGuard` pattern—controllers can gate access for users who haven't accepted required legal documents. The `LegalAcceptancesRepositoryPort` abstracts persistence, implemented with TypeORM against PostgreSQL, storing records with user and org associations.
