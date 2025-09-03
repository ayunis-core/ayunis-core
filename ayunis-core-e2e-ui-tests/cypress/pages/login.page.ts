import { BasePage } from '@pages/base.page';

class LoginPage extends BasePage {
	// Properties
	override path = `/login`;

	// Components

	// Elements
	get inputMailAddress() {
		return cy.get(`input[data-testid="email"]`);
	}

	get inputPassword() {
		return cy.get(`input[data-testid="password"]`);
	}

	get buttonSubmit() {
		return cy.get(`button[data-testid="submit"]`);
	}

}

export default new LoginPage();
