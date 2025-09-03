import { E2eTest01 } from '@data/accounts/E2eTest01.account';

describe('Login Functionality', () => {
	it('allows login for a registered user', () => {
		cy.login(E2eTest01.email, E2eTest01.password, E2eTest01.username);
	});
});
