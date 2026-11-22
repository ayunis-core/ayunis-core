/**
 * Whose credentials a provider connects with. An admin always creates and
 * allows the connection; with `user`, each user adds their own credentials
 * for it.
 */
export enum ConnectorCredentialScope {
  /** The admin enters everything, including the secret. */
  ORG = 'org',
  USER = 'user',
}
