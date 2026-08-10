import { test as setup } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const authFile = 'src/auth/.auth/state.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/');

  // TODO: implementar login específico do projeto
  // Exemplo genérico — adaptar para os seletores reais do app:
  await page.locator('input[name="email"]').fill(process.env.TEST_USER_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD!);
  await page.locator('button[type="submit"]').click();

  // Aguardar confirmação de login bem-sucedido
  // TODO: ajustar para o seletor que confirma autenticação no app específico
  await page.waitForURL(/dashboard|home|portal/);

  await page.context().storageState({ path: authFile });
});
