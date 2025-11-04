import { BaseComponent } from '@pages/components/base.component';

class ModelsDropdown extends BaseComponent {
	rootLocator = `div[data-slot="select-content"]`;

	get options() {
		return cy.get(`${this.rootLocator} div[data-slot="select-item"]`);
	}
}

export default new ModelsDropdown();
