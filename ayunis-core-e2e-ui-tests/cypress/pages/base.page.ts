export abstract class BasePage {
	// Properties
	abstract path: string;

	// Helpers
	open = () => {
		cy.visit(this.path);
		cy.urlpath().should('eql', this.path);
	};

	validateOn = () => {
		cy.urlpath().should('eq', this.path);
	};
}
