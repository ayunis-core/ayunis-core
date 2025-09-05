class LoginPage {
	// Properties
	path = `/login`;

	// Components

	// Elements
	get inputMailAddress() {
		return cy.get(`input[name="email"]`);
	}
	get inputPassword() {
		return cy.get(`input[name="password"]`);
	}

	get buttonSubmit() {
		return cy.get(`button[type="submit"]`);
	}

	// Helpers
	open = () => {
		cy.visit(this.path);
		cy.urlpath().should('eql', this.path);
	};
}

export default new LoginPage();
