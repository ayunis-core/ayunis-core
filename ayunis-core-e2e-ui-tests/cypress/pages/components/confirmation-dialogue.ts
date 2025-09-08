import { BaseComponent } from '@pages/components/base.component';

class ConfirmationDialogue extends BaseComponent {
	rootLocator = `div[role="dialog"]`;

	get desctructiveOption() {
		return cy.get(`${this.rootLocator} button.bg-destructive`);
	}
}

export default new ConfirmationDialogue();
