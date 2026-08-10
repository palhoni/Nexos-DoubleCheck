import {
  test as base,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';
import { environment } from '../../src/api/config/environment';
import { instrumentApiContext } from './instrumented-request';

type ApiWorkerFixtures = {
  apiContext: APIRequestContext;
  // Register one fixture per client here as endpoints are implemented, e.g.:
  // exampleClient: ExampleClient;
  // authToken: string;
};

export const test = base.extend<{}, ApiWorkerFixtures>({
  apiContext: [
    async ({}, use) => {
      const apiContext = await playwrightRequest.newContext({
        baseURL: environment.apiBaseUrl,
      });

      await use(instrumentApiContext(apiContext));
      await apiContext.dispose();
    },
    { scope: 'worker' },
  ],

  // exampleClient: [
  //   async ({ apiContext }, use) => {
  //     await use(new ExampleClient(apiContext));
  //   },
  //   { scope: 'worker' },
  // ],

  // authToken: [
  //   async ({ authClient }, use) => {
  //     const response = await authClient.login(environment.credentials);
  //
  //     if (!response.ok()) {
  //       throw new Error(
  //         `Authentication setup failed with HTTP ${response.status()}: ${await response.text()}`,
  //       );
  //     }
  //
  //     const body = (await response.json()) as LoginResponse;
  //     await use(body.token);
  //   },
  //   { scope: 'worker' },
  // ],
});

export { expect } from '@playwright/test';
