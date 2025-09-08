import {BaseComponent} from "@pages/components/base.component";

class ModelsDropdown extends BaseComponent {
	rootLocator = `div[data-slot="select-group"]`;

	get options() {
		return cy.get(`${this.rootLocator} div[role="option"]`);
	}

}

export default new ModelsDropdown();