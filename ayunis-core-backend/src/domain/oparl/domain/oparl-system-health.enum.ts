export enum OparlSystemHealth {
  /** No sync has finished yet. */
  PENDING = 'pending',
  HEALTHY = 'healthy',
  /** The last full listing was incomplete or would have removed too much. */
  SUSPICIOUS = 'suspicious',
  FAILING = 'failing',
}
