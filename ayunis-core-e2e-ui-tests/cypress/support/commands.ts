import LoginPage from '@pages/login.page';
import ChatsPage from '@pages/chats.page';

Cypress.Commands.add('login', (email: string, password: string, username: string) => {
	LoginPage.open();

	// Fill in Form
	LoginPage.inputMailAddress.type(email);
	LoginPage.inputPassword.type(password);
	LoginPage.buttonSubmit.click();

	// Validate Page & Session
	ChatsPage.sidebar.buttonMenu.should(`contain.text`, username);
});

Cypress.Commands.add('urlpath', () => {
	cy.url().then((url) => new URL(url).pathname);
});

/* eslint-disable no-unused-vars */
declare global {
	namespace Cypress {
		interface Chainable {
			login(email: string, password: string, username: string): Chainable<void>;
			urlpath(): Chainable<void>;
		}
	}
}
/* eslint-enable no-unused-vars */
