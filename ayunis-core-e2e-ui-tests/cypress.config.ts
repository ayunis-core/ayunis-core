import { defineConfig } from 'cypress';

export default defineConfig({
	e2e: {
		baseUrl: process.env['CYPRESS_BASE_URL'] || 'http://localhost:3000',
		setupNodeEvents(on, config) {
			on('before:run', async () => {
				// ENV Sanity Check
				const requiredEnv = [ `TEST_USER_PASSWORD` ];
				for (const key of requiredEnv) {
					if(!process.env[key]) {
						throw new Error(`${key} is not defined. The following Environment Variables need to be set: ${requiredEnv}`);
					}
				}
			});
		}
	},
});
