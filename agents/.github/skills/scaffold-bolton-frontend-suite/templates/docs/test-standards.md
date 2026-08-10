# Exemplos de código — Padrão de Testes de Frontend

Este documento **não repete** as regras e a mentalidade já descritas no `COPILOT.md` — ele existe só para os exemplos de código completos que não cabem confortavelmente num arquivo de regras enxuto. Leia o `COPILOT.md` primeiro (diretiva Bolton, tags HICCUPPS, checklist); volte aqui quando precisar ver como o código realmente fica.

---

## Estrutura de diretórios

```
tests/
  <feature>.spec.ts
  <feature>/
    <sub-feature>.spec.ts

src/
  pages/
    <feature>.page.ts            # Page Objects, um por página/tela
  fixtures/
    index.ts                     # test/expect com page objects injetados + evidenceScreenshot auto
  auth/                          # só existe se o app exige login
    setup.ts
  reporters/
    console.reporter.ts
```

**Regra**: cada página/feature tem seu Page Object correspondente. Specs organizados por feature, não por page object 1:1 — um spec pode cobrir vários page objects se o fluxo cruzar telas.

---

## Camadas do projeto

### 1. Page Object (`src/pages/`)

Encapsula locators e ações de uma página — sem assertions de negócio dentro dele (assertions de "página carregou" são aceitáveis em `expectLoad()`).

```ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.submitButton = page.getByRole('button', { name: /entrar/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### 2. Fixture (`src/fixtures/index.ts`)

Registra page objects como fixtures do Playwright. Ao adicionar um novo page object, registre-o aqui:

```ts
loginPage: async ({ page }, use) => {
  await use(new LoginPage(page));
},
```

Specs **sempre** importam `test`/`expect` daqui — nunca direto de `@playwright/test` — senão perdem os page objects injetados e o `evidenceScreenshot` automático.

---

## Anatomia de um teste

Onde o framework de steps (`test.step()`) estiver disponível, use-o para nomear cada ação — o Allure exibe cada step, e o `evidenceScreenshot` captura o estado final de cada página aberta ao fim do teste, passe ou falhe.

```ts
test('[@smoke] should log in with valid credentials', async ({ page, loginPage, homePage }) => {
  await test.step('Navigate to login page', async () => {
    await loginPage.goto();
  });

  await test.step('Submit valid credentials', async () => {
    await loginPage.login(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
  });

  await test.step('Validate redirect to home page', async () => {
    await expect(page).toHaveURL(/home|dashboard/);
  });

  await test.step('Validate home page shows the logged-in user', async () => {
    await expect(homePage.userGreeting, 'Expected the home page to greet the logged-in user').toBeVisible();
  });
});
```

### Regras

| Regra | Detalhe |
|-------|---------|
| **Steps nomeando a ação do usuário** | "Navigate to X", "Submit Y", "Click Z" — não "chamar função A" |
| **Assertions do Playwright, nunca `waitForTimeout`** | `expect(locator).toBeVisible()` já espera; timeout fixo é flaky por design |
| **Mensagens descritivas em `expect()`** | Facilita diagnóstico quando falha sem precisar reproduzir localmente |
| **Seletores**: `data-testid` > role/aria > CSS class | Nunca XPath |
| **`waitForLoadState('networkidle')`** | Após ações que disparam requests assíncronos relevantes pro teste |

### Critérios para `@smoke`

Um teste recebe `@smoke` quando valida que o caminho principal de uma feature crítica está funcionando: página carrega, login funciona (se aplicável), ação central da tela completa com sucesso.

---

## Categorias de cenários — exemplos de código

Cada categoria corresponde a uma tag HICCUPPS do `COPILOT.md`. Só o esqueleto do teste, sem repetir a explicação do oráculo.

### Smoke

```ts
test('[@smoke] should load the page and show main content', async ({ page }) => { ... });
```

### Security (autenticação)

```ts
test.describe('Security — authentication', { tag: ['@security'] }, () => {
  test('should redirect to login when accessing a protected page while logged out', async ({ page }) => { ... });
  test('should redirect to login when the session expires mid-navigation', async ({ page }) => { ... });
});
```

### Authz — autorização entre perfis/grupos (IDOR e conteúdo por perfil)

```ts
test.describe('Authz — cross-tenant access', { tag: ['@authz'] }, () => {
  // Acesso direto por URL a um recurso de outro grupo
  test('should block direct URL access to a resource from another group', async ({ page, clientSession }) => {
    await page.goto(`/resource/${OTHER_GROUP_RESOURCE_ID}`);
    await expect(page.getByText(/acesso negado|not found/i)).toBeVisible();
  });

  // Duas sessões de perfis diferentes, mesma tela — o conteúdo deveria divergir
  test('should scope the listing to the caller group even when both profiles can access the page', async ({
    browser,
  }) => {
    const adminPage = await (await browser.newContext({ storageState: 'src/auth/.auth/admin.json' })).newPage();
    const clientPage = await (await browser.newContext({ storageState: 'src/auth/.auth/client.json' })).newPage();

    await adminPage.goto('/resource-list');
    await clientPage.goto('/resource-list');

    const adminCount = await adminPage.getByTestId('row-count').textContent();
    const clientCount = await clientPage.getByTestId('row-count').textContent();
    expect(Number(clientCount)).toBeLessThan(Number(adminCount));
  });
});
```

Quando o comportamento correto ainda não foi confirmado pelo time, documente o estado atual como `[@authz]` sem assumir certo/errado, e registre a dúvida em `docs/bugs-index.md`.

### Idempotency — duplo submit (`@idempotency`)

```ts
test('[@idempotency] should not create a duplicate record on double-click submit', async ({ page, formPage }) => {
  await formPage.fillRequiredFields(uniquePayload());
  await Promise.all([formPage.submitButton.click(), formPage.submitButton.click()]);

  await page.goto('/resource-list');
  const matches = await page.getByText(uniquePayload().name).count();
  expect(matches).toBe(1);
});
```

### Validation

```ts
test.describe('Validation — invalid data rejection', { tag: ['@validation'] }, () => {
  test('should show an inline error when the required field is empty', async ({ page }) => { ... });
  test('should disable submit while the form is invalid', async ({ page }) => { ... });
});
```

### UX

```ts
test.describe('UX — user expectations', { tag: ['@ux'] }, () => {
  test('should show a loading state while the request is in flight', async ({ page }) => { ... });
  test('should preserve form input when navigation fails', async ({ page }) => { ... });
});
```

### Boundary (inclui ataques de software — Whittaker)

```ts
test.describe('Boundary — unusual inputs', { tag: ['@boundary'] }, () => {
  test('should handle an empty list state without breaking layout', async ({ page }) => { ... });
  for (const input of ['a'.repeat(500), '<script>alert(1)</script>', '  ']) {
    test(`should handle unusual input "${input.slice(0, 20)}..."`, async ({ page }) => { ... });
  }

  // Navegação inesperada (Whittaker)
  test('should not resubmit the form when using the browser back button after submit', async ({ page, formPage }) => {
    await formPage.fillRequiredFields(uniquePayload());
    await formPage.submitButton.click();
    await page.goBack();
    await page.goBack();
    // Confirma que o back não reenvia o POST (ex: via aviso do navegador ou redirecionamento)
  });

  // Dependência externa falhando (Whittaker)
  test('should show a graceful error when a dependent API call fails', async ({ page }) => {
    await page.route('**/api/dependent-resource', (route) => route.abort());
    await page.goto('/page-that-depends-on-it');
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
```

### Performance (`@performance`)

```ts
test('[@performance] should load the page within the expected budget', async ({ page }) => {
  const start = Date.now();
  await page.goto('/heavy-page');
  await page.waitForLoadState('networkidle');
  expect(Date.now() - start).toBeLessThan(3000);
});
```

### Regression

Só criar quando o primeiro bug real for documentado em `docs/bugs-index.md` — não inventar cenários hipotéticos.

```ts
test.describe('Regression — bugs already found', { tag: ['@regression'] }, () => {
  test('should show the validation error message for the enum field (BUG-003)', async ({ page }) => { ... });
});
```

---

## Helper functions

Quando múltiplos testes repetem as mesmas assertions, extraia para uma função helper no final do arquivo:

```ts
async function expectValidationError(page: Page, message: string | RegExp): Promise<void> {
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText(message);
}
```
