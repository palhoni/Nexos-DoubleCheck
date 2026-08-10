---
applyTo: "src/**"
---

# Padroes de codigo — con-api-automation (src/)

Aplicam-se a qualquer arquivo dentro de `src/**`. Ver `.github/copilot-instructions.md`
para a diretiva geral e arquitetura completa do projeto.

- Clients recebem `token: string | undefined` para suportar testes com e sem autenticacao.
- Contracts usam `additionalProperties: false` para detectar campos inesperados.
- Client: chamada HTTP pura, sem assertion — toda logica de validacao fica nos testes.
- Reporters (`src/reporters/`) nao tem dependencias externas.

## Checklist para novo endpoint (infraestrutura)

1. Criar client em `src/api/clients/<recurso>.client.ts`
2. Criar model em `src/api/models/<recurso>.models.ts`
3. Criar contract em `src/api/contracts/<recurso>.contract.ts`
4. Registrar client como worker fixture em `tests/fixtures/api.fixture.ts`
5. Criar pasta de testes em `tests/api/<dominio>/<recurso>/`
