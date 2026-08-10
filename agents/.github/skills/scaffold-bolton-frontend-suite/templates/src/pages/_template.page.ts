import { expect, Locator, Page } from '@playwright/test';

export class __PAGE_NAME__Page {
  readonly page: Page;
  // TODO: declarar locators aqui

  constructor(page: Page) {
    this.page = page;
    // TODO: inicializar locators
    // Preferência de seletores: data-testid > role/aria > CSS class
    // NUNCA usar XPath
    // Exemplo:
    // this.submitButton = page.locator('[data-testid="submit-btn"]');
    // this.title = page.getByRole('heading', { name: /título/i });
  }

  async goto() {
    await this.page.goto('/rota-da-pagina');
  }

  async expectLoad() {
    // TODO: assertions que confirmam que a página carregou
    // Usar assertions do Playwright — nunca waitForTimeout
    // await expect(this.submitButton).toBeVisible();
  }

  // Métodos de ação (o que o usuário faz)
  // async fillForm(data: FormData) { ... }

  // Métodos de asserção (o que esperamos ver)
  // async expectSuccessMessage() { ... }
}
