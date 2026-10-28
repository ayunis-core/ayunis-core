export abstract class SsoProvisioningLock {
  abstract acquireIdentity(issuer: string, subject: string): Promise<void>;
  abstract acquireEmail(email: string): Promise<void>;
}
