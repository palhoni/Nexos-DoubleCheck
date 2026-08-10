import { test as base } from '@playwright/test';
// TODO: importar page objects conforme forem criados
// import { LoginPage } from '../pages/login.page';
// import { HomePage } from '../pages/home.page';

type Fixtures = {
  // loginPage: LoginPage;
  // homePage: HomePage;
  evidenceScreenshot: void;
};

/**
 * evidenceScreenshot roda automaticamente em todo teste (auto: true) — não
 * precisa ser declarado nos parâmetros do teste. Ao final de cada teste
 * (passou ou falhou), tira um screenshot de cada página/aba ainda aberta e
 * anexa via testInfo.attach(), visível no HTML report e no Allure. É o
 * equivalente, para frontend, dos anexos de request/response do stack de API.
 */
export const test = base.extend<Fixtures>({
  // loginPage: async ({ page }, use) => {
  //   await use(new LoginPage(page));
  // },
  // homePage: async ({ page }, use) => {
  //   await use(new HomePage(page));
  // },
  evidenceScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();
      const pages = page.context().pages();
      for (let i = 0; i < pages.length; i++) {
        const target = pages[i];
        if (target.isClosed()) continue;
        try {
          const screenshot = await target.screenshot({ fullPage: true });
          const suffix = pages.length > 1 ? `-${i + 1}` : '';
          await testInfo.attach(`evidence${suffix}`, {
            body: screenshot,
            contentType: 'image/png',
          });
        } catch {
          // Page may have closed or be mid-navigation; skip it.
        }
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
