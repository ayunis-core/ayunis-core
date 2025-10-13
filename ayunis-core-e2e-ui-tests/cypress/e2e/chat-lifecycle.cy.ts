import ChatPage from '@pages/chat.page';
import { E2eTestGeneral } from '@data/accounts/E2eTest01.account';
import { getTimestring } from '@helpers/time.helper';
import NewChatPage from '@pages/new-chat.page';

describe('Chat Lifecycle', () => {
	it('allows a user to create, rename and delete a chat', () => {
		const timestring = getTimestring();
		cy.login(E2eTestGeneral.email, E2eTestGeneral.username, E2eTestGeneral.password);

		NewChatPage.validateOn();
		NewChatPage.chatInput.modelSelectTrigger.should('contain.text', 'GPT-4o mini');

		NewChatPage.chatInput.textareaChatInput.type(
			`Name this chat ${timestring} and print the name of the model I am talking to`,
		);
		NewChatPage.chatInput.submitButton.click();

		// Wait for navigation to the chat page and validate URL
		cy.url().should('include', '/chats/', { timeout: 10000 });

		// Wait for the chat page to load and validate it's the correct page
		ChatPage.validateOn();

		// Wait for the assistant message to appear before reloading
		cy.withTimeout('XLONG', () => {
			ChatPage.assistantMessages.should('exist');
			// Mock handler responds to naming request
			ChatPage.assistantMessages.should('contain.text', timestring);
			ChatPage.assistantMessages.should('contain.text', 'openai::gpt-4o-mini');
		});

		// Reload to update the sidebar (temporary workaround)
		cy.reload();

		// Re-validate we're still on the chat page after reload
		ChatPage.validateOn();

		// Verify the assistant message is still there after reload
		cy.withTimeout('XLONG', () => {
			ChatPage.assistantMessages.should('contain.text', timestring);
			ChatPage.assistantMessages.should('contain.text', 'openai::gpt-4o-mini');
		});
		// The chat title will be the assistant's response which starts with "I'll name this chat"
		ChatPage.spanTitle.should('contain.text', `I'll name this chat ${timestring}`);
		ChatPage.sidebar.chats.should('contain.text', `I'll name this chat`);

		// Find the chat in the sidebar that contains our timestring
		ChatPage.sidebar.chats.contains(`I'll name this chat`).first().parent().within(() => {
			cy.get('button[data-testid="dropdown-menu-trigger"]').click();
		});
		ChatPage.chatDropdown.buttonDelete.click();

		ChatPage.confirmationDialogue.desctructiveOption.should('exist');
		ChatPage.confirmationDialogue.desctructiveOption.click();

		// Verify the chat with our naming pattern is deleted
		ChatPage.sidebar.chats.should('not.contain.text', `I'll name this chat ${timestring}`);
	});

	it('allows user to choose the provided models', () => {
		const timestring = getTimestring();
		cy.login(E2eTestGeneral.email, E2eTestGeneral.username, E2eTestGeneral.password);
		NewChatPage.validateOn();

		NewChatPage.chatInput.modelSelectTrigger.click();
		NewChatPage.modelsDropdown.options.each(($element) => {
			const modelName = $element.text();

			NewChatPage.modelsDropdown.options.contains(modelName).click();

			NewChatPage.chatInput.textareaChatInput.type(
				`Name this chat ${timestring} and print the name of the model I am talking to`,
			);
			NewChatPage.chatInput.submitButton.click();

			// Wait for navigation to the chat page
			cy.url().should('include', '/chats/', { timeout: 10000 });
			ChatPage.validateOn();

			// Make sure not to fail the test just because the external communication is slow
			cy.withTimeout('XLONG', () => {
				// Mock handler returns format: provider::model
				// For GPT-4o mini, expect openai::gpt-4o-mini
				ChatPage.assistantMessages.last().should('contain.text', 'openai::gpt-4o-mini');
			});

			// Navigate back to new chat page for next iteration
			cy.visit('/chat');
			NewChatPage.validateOn();
			NewChatPage.chatInput.modelSelectTrigger.click();
		});
	});
});
