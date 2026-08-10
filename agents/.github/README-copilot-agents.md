# Agentes QA para GitHub Copilot

Este diretório contém o sistema de agentes QA para GitHub Copilot.
A metodologia e as convenções são idênticas ao modelo operacional deste
projeto; o que muda é o mecanismo de acionamento por prompts/comandos.

## O que tem aqui

- **`copilot-instructions.md`** — carregado automaticamente pelo Copilot Chat
  em toda conversa neste repositório. Contém a diretiva geral (metodologia
  Bolton + heuristicas), stack, comandos, arquitetura e a tabela de roteamento
  para os agentes.
- **`instructions/tests.instructions.md`** e **`instructions/src.instructions.md`**
  — convenções aplicadas automaticamente quando um arquivo em `tests/**` ou
  `src/**`, respectivamente, está em edição ou em contexto (`applyTo` no
  frontmatter). Isso funciona mesmo sem invocar nenhum agente explicitamente.
- **`agents/agentN-*.md`** — o conteúdo completo de cada agente. É a fonte de
  verdade; os prompt files abaixo só
  apontam para cá.
- **`prompts/agentN-*.prompt.md`** — atalhos de slash-command, **exclusivos do
  VS Code**. Digitando `/agent1-analisador-us` (etc.) no Copilot Chat, o
  arquivo de agente correspondente é carregado como contexto automaticamente.
- **`skills/`** — skills de scaffolding empacotadas no próprio repositório
  para portabilidade entre máquinas e projetos:
  - `.github/skills/scaffold-bolton-api-suite/`
  - `.github/skills/scaffold-bolton-api-suite-pytest/`
  - `.github/skills/scaffold-bolton-frontend-suite/`

## Como usar

**No VS Code, em modo Agent do Copilot Chat:**
Digite o slash-command direto, ex: `/agent5-executor-testes-api`.

Slash-commands disponíveis neste repositório:

- `/agent1-analisador-us`
- `/agent2-desenhista-testes`
- `/agent3-engenheiro-reverso-frontend`
- `/agent4-descobridor-endpoints`
- `/agent5-executor-testes-api`
- `/agent6-detetive-falhas`
- `/agent7-gerador-bug-report`
- `/agent8-retest`
- `/agent9-auditor`

**Em qualquer outro cliente Copilot (JetBrains, Visual Studio, github.com):**
Os prompt files não funcionam como slash-command fora do VS Code, mas
`copilot-instructions.md` já é carregado automaticamente e contém a tabela de
roteamento — basta pedir em linguagem natural (ex: "executa os testes",
"investiga as falhas") que o Copilot deve identificar a intenção e seguir o
arquivo de agente indicado em `.github/agents/`. Se isso não acontecer
automaticamente no seu cliente, referencie o arquivo manualmente, ex:
"siga as instruções de `.github/agents/agent6-detetive-falhas.md`".

## Notas de implementação

- **Agente 3** não assume nomes específicos de ferramentas MCP — descreve as
  capacidades necessárias (navegar, ler página, interceptar rede, preencher
  formulário) e usa o que estiver configurado no ambiente.
- **Agente 9** (Auditor) existe também na versão Copilot, com o mesmo papel de
  guardrail de qualidade de testes e integração ao fluxo do Agente 5.

## Manutenção

`.github/copilot-instructions.md` e `.github/agents/` são as fontes canônicas
deste pacote. Se uma convenção mudar, replique nos prompts e skills para manter
consistência operacional.

### Verificação de portabilidade

Antes de levar o pacote para outra máquina/projeto, rode a checagem de
integridade:

```bash
./.github/scripts/verify-agent-system.sh
```

O script valida:
- presença de `agents/`, `prompts/`, `skills/`
- links `#file:` dos prompts para agents existentes
- paridade agent <-> prompt
- bundles locais de skills (`SKILL.md` + `templates/`)
- menções de roteamento no `copilot-instructions.md`
