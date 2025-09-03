import Navigation from './components/sidebar.component';
import { BasePage } from '@pages/base.page';

class ChatsPage extends BasePage {
	// Properties
	override path = `/chats`;

	// Components
	get navigation() {
		return Navigation;
	}

	// Elements

}

export default new ChatsPage();
