import LoginPage from '@pages/login.page';

Cypress.Commands.add('login', (email, password) => {
	LoginPage.open();

	LoginPage.inputMailAddress.type(email);
	LoginPage.inputPassword.type(password);
	LoginPage.buttonSubmit.click();
});

Cypress.Commands.add('urlpath', () => {
	cy.url().then((url) => new URL(url).pathname);
});

/* eslint-disable no-unused-vars */
declare global {
	namespace Cypress {
		interface Chainable {
			login(email: string, password: string): Chainable<void>;
			urlpath(): Chainable<void>;
		}
	}
}
/* eslint-enable no-unused-vars */
