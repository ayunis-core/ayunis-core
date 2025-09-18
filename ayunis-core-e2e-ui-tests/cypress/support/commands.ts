import LoginPage from '@pages/login.page';
import ChatsPage from '@pages/chat.page';

Cypress.Commands.add('login', (email: string, username: string, password: string) => {
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

Cypress.Commands.add('withTimeout', (timeoutLength: 'LONG' | 'XLONG', callback: () => void) => {
	const initialTimeout = Cypress.config('defaultCommandTimeout');

	switch (timeoutLength) {
		case 'LONG':
			Cypress.config('defaultCommandTimeout', initialTimeout * 2);
			break;
		case 'XLONG':
			Cypress.config('defaultCommandTimeout', initialTimeout * 5);
			break;
		//case "XXLONG":
		//	Cypress.config('defaultCommandTimeout', initialTimeout * 15);
		//	break;
	}

	callback();

	Cypress.config('defaultCommandTimeout', initialTimeout);
});

/* eslint-disable no-unused-vars */
declare global {
	namespace Cypress {
		interface Chainable {
			login(email: string, username: string, password: string): Chainable<void>;
			urlpath(): Chainable<void>;
			withTimeout(timeoutLength: 'LONG' | 'XLONG', callback: () => void): void;
		}
	}
}
/* eslint-enable no-unused-vars */
