/**
 * Whether a credit limit applies to a single user or to a whole team
 * (a shared pool across the team's current members).
 */
export enum CreditLimitScope {
  USER = 'USER',
  TEAM = 'TEAM',
}
