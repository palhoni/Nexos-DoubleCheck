# agentes-qa-copilot

Pacote de agentes QA para GitHub Copilot, com foco em automacao de testes (API e frontend) orientada por contexto.

## O que este repositorio contem

- Sistema de agentes em `.github/agents/` (Agentes 1 a 9)
- Slash commands em `.github/prompts/`
- Diretriz central em `.github/copilot-instructions.md`
- Instrucoes de convencao em `.github/instructions/`
- Skills locais portaveis em `.github/skills/`
- Script de verificacao em `.github/scripts/verify-agent-system.sh`

## Como usar (rapido)

1. Clone o repositorio.
2. Abra no VS Code com Copilot Chat em modo Agent.
3. Acione um agente por slash command, por exemplo:
   - `/agent1-analisador-us`
   - `/agent5-executor-testes-api`
   - `/agent9-auditor`

## Verificacao de integridade

Rode:

```bash
./.github/scripts/verify-agent-system.sh
```

Esse script valida:

- Estrutura obrigatoria (`agents`, `prompts`, `skills`)
- Paridade agent <-> prompt
- Roteamento em `.github/copilot-instructions.md`
- Convencao de bug-report (`bug-report-<data>-<tema>.md`)

## Documentacao principal

- Guia operacional dos agentes: `.github/README-copilot-agents.md`
- Diretriz central: `.github/copilot-instructions.md`

## Licenca

Defina a licenca conforme a politica do seu time/organizacao.
