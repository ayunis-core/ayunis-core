export abstract class BasePage {
	// Properties
	abstract path: string;

	// Helpers
	/* eslint-disable no-unused-vars */
	// Needed to allow subclasses to add parameters (eg. if there's a GUID in the URL)
	open = (..._args: any[]) => {
		cy.visit(this.path);
		cy.urlpath().should('eql', this.path);
	};

	validateOn = (..._args: any[]) => {
		cy.urlpath().should('eq', this.path);
	};
	/* eslint-enable no-unused-vars */
}
