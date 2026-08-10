# Exemplos de código — Padrão de Testes de API

Este documento **não repete** as regras e a mentalidade já descritas no `COPILOT.md` — ele existe só para os exemplos de código completos que não cabem confortavelmente num arquivo de regras enxuto. Leia o `COPILOT.md` primeiro (diretiva Bolton, 7 perguntas, tags, checklist); volte aqui quando precisar ver como o código realmente fica.

---

## Estrutura de diretórios

```
tests/
  fixtures/
    api.fixture.ts              # Fixtures compartilhadas (apiContext, clients, authToken)
  api/
    <dominio>/
      <recurso>/
        <recurso>.spec.ts
        auth.spec.ts
        <filtro>.spec.ts
        ...

src/api/
  clients/                      # Clients HTTP por recurso
  config/                       # Configuração de ambiente
  contracts/                    # JSON Schemas para validação de contrato
  models/                       # Tipos TypeScript das respostas/requests
```

**Regra**: cada endpoint ou domínio tem sua própria pasta. Dentro dela, os testes são organizados por funcionalidade (filtros, autenticação, contrato, etc.).

---

## Camadas do projeto

### 1. Client (`src/api/clients/`)

Encapsula as chamadas HTTP. Cada recurso da API tem seu próprio client.

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class ExampleClient {
  constructor(private readonly request: APIRequestContext) {}

  list(token: string | undefined, query: ExampleQuery): Promise<APIResponse> {
    return this.request.get('/example-resource', {
      headers: {
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      params: query,
    });
  }
}
```

### 2. Model (`src/api/models/`)

Tipos TypeScript que representam as requisições e respostas da API.

```ts
export type ExampleQuery = {
  page: number;
  pageSize: number;
  filter?: string;
};

export type ExampleResponse = {
  metadata: { resultset: { count: number } };
  result: { items: ExampleItem[] };
};
```

### 3. Contract (`src/api/contracts/`)

JSON Schema usado para validação estrutural da resposta via AJV.

```ts
export const exampleContract = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'result'],
  properties: {
    // ...
  },
} as const;
```

### 4. Fixture (`tests/fixtures/api.fixture.ts`)

Registra clients e token como worker fixtures do Playwright. Ao adicionar um novo client, registre-o aqui:

```ts
exampleClient: [
  async ({ apiContext }, use) => {
    await use(new ExampleClient(apiContext));
  },
  { scope: 'worker' },
],
```

---

## Anatomia de um teste

Todo código dentro de um `test()` **deve** estar encapsulado em `test.step()`. Isso garante que o Allure Report exiba cada ação como um passo visível — e, com `instrumented-request.ts` na fixture, cada chamada HTTP dentro do step já vem com o request/response anexado automaticamente.

```ts
test('[@tag] should do something expected', async ({ exampleClient, authToken }) => {
  // Step 1 — Chamada HTTP (descrever o método, endpoint e parâmetros relevantes)
  const response = await test.step('GET /example-resource with filter=value', async () => {
    return exampleClient.list(authToken, {
      page: 1,
      pageSize: 100,
      filter: 'value',
    });
  });

  // Step 2 — Validação de status HTTP
  await test.step('Validate HTTP 200', async () => {
    expect(response.status(), 'Expected the request to return HTTP 200').toBe(200);
  });

  // Step 3 — Parse do body (quando necessário para steps seguintes)
  const body = await test.step('Parse response body', async () => {
    return (await response.json()) as ExampleResponse;
  });

  // Step 4+ — Validações de negócio
  await test.step('Validate items match the applied filter', async () => {
    expect(body.result.items.length).toBeGreaterThan(0);
    expect(
      body.result.items.every((item) => item.filter === 'value'),
      'Expected the filter not to leak unrelated items',
    ).toBe(true);
  });
});
```

### Regras dos steps

| Regra | Detalhe |
|-------|---------|
| **Nenhum código fora de `test.step()`** | Toda linha executável dentro de `test()` deve estar em um step |
| **Nome descritivo no step de request** | Incluir método HTTP, endpoint e parâmetros relevantes |
| **Step separado para status HTTP** | Sempre validar o status em seu próprio step |
| **Step separado para parse do body** | Quando o body é usado em steps seguintes, parse em step próprio com retorno tipado |
| **Steps de validação agrupados por tema** | Ex: "Validate pagination fields", "Validate items match filter" |
| **Messages nos expects** | Usar mensagens descritivas em `expect()` para facilitar diagnóstico de falhas |

### Critérios para `@smoke`

Um teste recebe `@smoke` quando valida que o caminho principal de um fluxo crítico está funcionando. Exemplos:
- API respondendo (reachability)
- Login com credenciais válidas retornando token (se aplicável)
- Endpoint principal retornando dados com autenticação
- Acesso sem token sendo bloqueado com 401 (se aplicável)

---

## Categorias de cenários — exemplos de código

Cada categoria abaixo corresponde a uma das 7 perguntas Bolton do `COPILOT.md`. Só o esqueleto do teste, sem repetir a explicação da pergunta.

### Smoke / Contrato

```ts
test('[@smoke] should return resources with valid filters', async ({ ... }) => { ... });
test('[@contract] should comply with the response contract', async ({ ... }) => { ... });
```

### Consistência interna

`metadata.count` vs `result.length`, totais parciais somando o total geral.

```ts
test('should report a count that matches the actual number of items', async ({ ... }) => { ... });
```

### Integridade dos dados

Unicidade, formato, completude, ausência de lixo.

```ts
test('should return unique values without duplicates', async ({ ... }) => { ... });
test('should return values in the expected standard format', async ({ ... }) => { ... });
```

### Cross-reference

```ts
test('should only list values that return results when used as a filter', async ({ ... }) => { ... });
test('should list every value that exists in the main resource', async ({ ... }) => { ... });
```

### Idempotência

```ts
test('should return the same options on consecutive calls', async ({ ... }) => { ... });
```

### Autenticação

```ts
test.describe('[@auth] Resource — Authentication', () => {
  test('should return 401 when no token is provided', ...);
  test('should return 401 when token is invalid', ...);
  test('should return 401 when token is malformed JWT', ...);
  test('should return 401 when authorization header has wrong scheme', ...);
});
```

### Autorização entre perfis/grupos — pergunta 8 (IDOR) e 8b (conteúdo por perfil)

```ts
test.describe('[@authz] Resource — Cross-tenant access', () => {
  // Pergunta 8 — acesso cruzado por ID direto
  test('should return 403/404 when CLIENT requests a resource ID from another group', async ({
    resourceClient,
    clientAuthToken,
  }) => {
    const response = await resourceClient.getById(clientAuthToken, OTHER_GROUP_RESOURCE_ID);
    expect([403, 404]).toContain(response.status());
  });

  // Pergunta 8b — dois perfis recebem 200, mas o conteúdo deveria divergir
  test('should scope the listing to the caller group even when status is 200 for both profiles', async ({
    resourceClient,
    adminAuthToken,
    clientAuthToken,
  }) => {
    const adminView = await (await resourceClient.list(adminAuthToken)).json();
    const clientView = await (await resourceClient.list(clientAuthToken)).json();

    expect(clientView.result.total, 'CLIENT nao deveria enxergar o dataset completo da plataforma').toBeLessThan(
      adminView.result.total,
    );
  });
});
```

Quando o comportamento correto ainda não foi confirmado pelo time, documente o estado atual como `[@authz]` sem assumir certo/errado, e registre a dúvida em `docs/bugs-index.md`.

### Idempotência de escrita (`@idempotency`)

```ts
test('[@idempotency] should not duplicate the resource when the same POST is retried', async ({ resourceClient, authToken }) => {
  const idempotencyKey = `test-${Date.now()}`;
  const first = await resourceClient.create(authToken, payload, { idempotencyKey });
  const retry = await resourceClient.create(authToken, payload, { idempotencyKey });

  expect(retry.status()).toBe(first.status());
  const listing = await (await resourceClient.list(authToken)).json();
  expect(listing.result.items.filter((i) => i.idempotencyKey === idempotencyKey)).toHaveLength(1);
});
```

### Ataques de software (Whittaker)

```ts
test('[@boundary] should reject an unexpected HTTP method', async ({ apiContext, authToken }) => {
  const response = await apiContext.delete('/read-only-resource', {
    headers: { authorization: `Bearer ${authToken}` },
  });
  expect([404, 405]).toContain(response.status());
});

test('[@boundary] should handle rapid repeated requests without corrupting state', async ({ resourceClient, authToken }) => {
  const responses = await Promise.all(
    Array.from({ length: 10 }, () => resourceClient.create(authToken, payload)),
  );
  // Confirma que ou todas sucederam de forma consistente, ou a API rejeitou
  // o excesso com um status claro (429/409) — nunca um estado parcialmente corrompido.
});
```

### Filtros / Boundaries

```ts
test.describe('Resource — Filter name', () => {
  test('should return a contract-compliant result for a valid filter value', ...);
  test('should include items exactly on the boundary value', ...);
  test('should produce a subset when the filter narrows', ...);
  test('should preserve totals when page size changes', ...);
  test('should return a consistent empty page for a nonexistent value', ...);
  test('should return unique identities with matching detail links', ...);

  for (const invalidValue of ['invalid-format', ' spaces ', 'wrong/format']) {
    test(`should reject invalid filter value "${invalidValue}"`, ...);
  }
});
```

### Validação de entrada

Valida que a API retorna 400 com erros descritivos para entradas inválidas. Ajuste o formato do erro conforme o contrato real da API.

---

## Helper functions

Quando múltiplos testes repetem as mesmas assertions, extraia para uma função helper no final do arquivo:

```ts
async function expectValidationErrorResponse(response: {
  json(): Promise<unknown>;
}): Promise<void> {
  const body = (await response.json()) as ApiError;
  expect(body.level).toBe('error');
  expect(body.statusCode).toBe(400);
  // ...
}
```
