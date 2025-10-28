# TICKET-002: Implement MCP Credential Encryption Service

## Description

Create a secure credential encryption service for storing MCP integration authentication credentials at rest in the database. The service must use AES-256-GCM encryption with a key stored in environment variables.

**Why**: MCP integrations require storing API keys and bearer tokens securely. Credentials must be encrypted at rest and only decrypted when creating MCP client connections.

**Technical Approach**:
1. Create port interface for encryption service
2. Implement concrete encryption service using Node.js `crypto` module
3. Use AES-256-GCM algorithm
4. Store encryption key in environment variable
5. Register service as provider in MCP module

## Acceptance Criteria

- [ ] `McpCredentialEncryptionPort` abstract class created in `src/domain/mcp/application/ports/mcp-credential-encryption.port.ts`
- [ ] Port defines methods: `encrypt(plaintext: string): Promise<string>` and `decrypt(ciphertext: string): Promise<string>`
- [ ] Concrete implementation `McpCredentialEncryptionService` created in `src/domain/mcp/infrastructure/encryption/mcp-credential-encryption.service.ts`
- [ ] Service uses AES-256-GCM encryption algorithm
- [ ] Service reads encryption key from environment variable `MCP_ENCRYPTION_KEY`
- [ ] Service throws clear error if `MCP_ENCRYPTION_KEY` is not configured
- [ ] Encrypted output includes initialization vector (IV) prepended to ciphertext
- [ ] Service is registered as provider in `McpModule`
- [ ] Unit tests added for:
  - Successful encryption produces non-plaintext output
  - Decryption correctly reverses encryption (roundtrip test)
  - Encrypting same plaintext twice produces different ciphertext (IV randomness)
  - Decryption fails gracefully with invalid ciphertext
  - Service throws error when encryption key is missing
- [ ] Example `.env` entry added to `.env.example` for `MCP_ENCRYPTION_KEY`

## Dependencies

None - this is a foundation ticket

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/ports/mcp-credential-encryption.port.ts`
- `src/domain/mcp/infrastructure/encryption/mcp-credential-encryption.service.ts`

**Files to modify**:
- `src/domain/mcp/mcp.module.ts` (register service as provider)
- `.env.example` (add MCP_ENCRYPTION_KEY documentation)

**Port Interface**:
```typescript
export abstract class McpCredentialEncryptionPort {
  abstract encrypt(plaintext: string): Promise<string>;
  abstract decrypt(ciphertext: string): Promise<string>;
}
```

**Encryption Format**:
- Algorithm: AES-256-GCM
- Key: 32 bytes (256 bits) from environment variable
- IV: Random 16 bytes (generated per encryption)
- Output format: `base64(iv + ciphertext + authTag)`

**Environment Variable**:
```bash
# Generate key: openssl rand -hex 32
MCP_ENCRYPTION_KEY=your-32-byte-hex-key-here
```

**Testing Approach**:
- Mock environment variable in tests
- Test roundtrip encryption/decryption
- Test error cases (missing key, invalid ciphertext)
- Verify IV randomness (encrypt same value twice, compare outputs)

**Security Considerations**:
- Never log decrypted credentials
- Never return decrypted credentials in API responses
- Key rotation strategy deferred to future ticket
