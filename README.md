# Nexo Double Check

Plataforma interna Double Check para organizar conhecimento de projetos e executar Agents de qualidade sobre requisitos funcionais.

Este repositório é um monorepo npm com:

- `apps/api`: API NestJS, Prisma e PostgreSQL;
- `apps/web`: frontend React, TypeScript e Vite;
- `agents`: pacote legado das definições dos Agents (formato GitHub Copilot Chat), sendo substituído por `.claude/agents`;
- `.claude\agents`: definições dos Agents no formato de subagent do Claude Code, usadas tanto pela API quanto pelo Claude Code;
- `apps/api/prisma/migrations`: histórico completo de migrations do banco;
- `apps/api/prisma/seed.ts`: usuários padrão e dados de demonstração.

## 1. Pré-requisitos

Instale antes de iniciar:

- Git;
- Node.js `20.19+`, `22.12+` ou `24+`;
- npm `10+`;
- PostgreSQL 15 ou superior;
- opcionalmente, uma chave de API da Anthropic (Claude) — sem ela, os Agents usam a sessão local do Claude Code (ver seção 9).

Confirme as instalações:

```bash
git --version
node --version
npm --version
psql --version
```

## 2. Clonar e instalar as dependências

```bash
git clone https://github.com/palhoni/Nexos-DoubleCheck.git
cd Nexos-DoubleCheck
npm install
```

O `npm install` executado na raiz instala as dependências da API e do frontend por meio dos workspaces.

> Se a pasta local possuir espaços no nome, coloque o caminho entre aspas. Exemplo no Windows: `cd "C:\Doublecheck\NEXUS 2.0"`.

## 3. Instalar e preparar o PostgreSQL

### Windows

1. Instale o PostgreSQL pelo instalador oficial.
2. Durante a instalação, anote a senha definida para o usuário `postgres`.
3. Mantenha a porta padrão `5432` e marque a instalação das ferramentas de linha de comando.
4. Abra o SQL Shell (`psql`) ou o PowerShell e conecte-se:

```powershell
psql -U postgres -h localhost
```

Se `psql` não estiver no `PATH`, use um caminho semelhante a:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost
```

### macOS

Com Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
psql postgres
```

Se o comando `psql` não for encontrado após a instalação:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Em Macs Intel, o prefixo do Homebrew normalmente é `/usr/local` em vez de `/opt/homebrew`.

### Criar usuário e banco

Execute dentro do `psql`, tanto no Windows quanto no macOS:

```sql
CREATE USER nexus_api WITH PASSWORD 'troque-por-uma-senha-local-forte';
CREATE DATABASE doublecheck OWNER nexus_api;
GRANT ALL PRIVILEGES ON DATABASE doublecheck TO nexus_api;
```

Saia do `psql`:

```text
\q
```

Teste a conexão:

```bash
psql -h localhost -U nexus_api -d doublecheck
```

## 4. Configurar as variáveis de ambiente

### Windows PowerShell

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

### macOS

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edite `apps/api/.env`:

```dotenv
DATABASE_URL="postgresql://nexus_api:troque-por-uma-senha-local-forte@localhost:5432/doublecheck?schema=public"

JWT_ACCESS_SECRET="cole-aqui-um-segredo-hexadecimal"
JWT_ACCESS_EXPIRES_IN="8h"

WEB_ORIGIN="http://localhost:5173"
PORT=3000

ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL_DEFAULT="claude-opus-5"
AGENT_EFFORT_DEFAULT="high"
AGENT_MAX_OUTPUT_TOKENS=32000
AGENT_TIMEOUT_MS=900000

SEED_ADMIN_EMAIL="admin@nexus.local"
SEED_ADMIN_PASSWORD="NexusAdmin123!"
SEED_ADMIN_NOME="Administrador do Piloto"

SEED_AGENT_EMAIL="agent_ia@teste.com"
SEED_AGENT_PASSWORD="Caete@1234"
SEED_AGENT_NOME="Agent IA"
```

Gere o `JWT_ACCESS_SECRET` em qualquer sistema operacional:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O arquivo `apps/web/.env` deve conter:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

> Caracteres especiais na senha do PostgreSQL precisam estar codificados na URL. Por exemplo, `@` deve ser escrito como `%40` dentro de `DATABASE_URL`.

## 5. Gerar o Prisma Client, executar todas as migrations e popular o banco

Execute na raiz do repositório:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

O comando `npm run db:migrate` utiliza `prisma migrate deploy` e aplica, em ordem, todas as migrations ainda pendentes de `apps/api/prisma/migrations`.

Confira o estado do banco:

```bash
npm run db:status
```

Abra o Prisma Studio para consultar os dados visualmente:

```bash
npm run db:studio
```

O Prisma Studio normalmente fica disponível em `http://localhost:5555`.

### Criar uma nova migration durante o desenvolvimento

Use somente quando o arquivo `schema.prisma` tiver sido alterado intencionalmente:

```bash
npm run db:migrate:dev -- --name descricao_da_alteracao
```

Depois versione a nova pasta criada em `apps/api/prisma/migrations`.

### Diferença entre os comandos de migration

| Comando | Quando usar |
|---|---|
| `npm run db:migrate` | Instalação, atualização e ambientes compartilhados. Aplica migrations existentes. |
| `npm run db:migrate:dev -- --name nome` | Desenvolvimento de uma alteração nova no schema. Cria uma migration. |
| `npm run db:status` | Verifica migrations aplicadas e pendentes. |
| `npm run db:generate` | Regenera o Prisma Client após mudanças no schema ou nas migrations. |
| `npm run db:seed` | Cria dados de demonstração e os usuários padrão. |

O seed usa `upsert` e pode ser executado novamente sem duplicar os registros principais.

## 6. Subir o ambiente

O procedimento é igual no Windows e no macOS. Abra dois terminais na raiz do projeto.

### Terminal 1 — API

```bash
npm run dev:api
```

A API fica disponível em `http://localhost:3000/api`.

### Terminal 2 — frontend

```bash
npm run dev:web
```

O sistema fica disponível em:

```text
http://localhost:5173
```

Para encerrar cada processo, pressione `Ctrl + C` no respectivo terminal.

## 7. Usuários padrão

Os usuários abaixo são criados por `npm run db:seed` em uma instalação nova.

| Perfil | E-mail | Senha | Destino após o login |
|---|---|---|---|
| Administrador | `admin@nexus.local` | `NexusAdmin123!` | Visão geral e configuração dos projetos |
| Agent IA | `agent_ia@teste.com` | `Caete@1234` | Orquestração e ferramentas dos Agents |

As credenciais podem ser alteradas antes do seed pelas variáveis `SEED_ADMIN_*` e `SEED_AGENT_*`.

> Essas credenciais são apenas para desenvolvimento local. Troque as senhas em qualquer ambiente compartilhado, de homologação ou produção. O seed não redefine a senha de um usuário que já existe.

## 8. Como usar as features

### Perfil Administrador

1. Entre com `admin@nexus.local`.
2. Acesse **Setup > Projetos**.
3. Crie ou abra um projeto.
4. Dentro do projeto, organize:
   - Times;
   - Pessoas;
   - Produtos;
   - Regras de negócio;
   - Documentos e fontes de conhecimento;
   - Integrações;
   - Países;
   - Auditoria.
5. Use a **Visão Geral** para acompanhar os indicadores e a maturidade da base.

Algumas áreas operacionais ainda aparecem desabilitadas com a indicação **Em breve**.

### Perfil Agent IA

Entre com `agent_ia@teste.com`.

#### Analisador de US — Agent 1

1. Abra **Orquestração**.
2. Selecione **Analisador de US**.
3. Escolha o projeto que fornecerá o contexto isolado.
4. Informe o identificador da US.
5. Cole o requisito ou carregue um PDF exportado pelo Jira.
6. Revise a visualização organizada.
7. Clique em **Iniciar análise do requisito**.
8. Acompanhe o processamento.
9. Ao concluir, o sistema abre a tela própria da US.

O resultado fica salvo em **Análises de US** e apresenta:

- requisito reescrito;
- gate de qualidade;
- pontos de atenção;
- decisões que precisam do PO;
- perguntas de refinamento;
- cenários de teste;
- regras de negócio;
- relatório técnico.

Se ocorrer timeout ou interrupção, o conteúdo recebido até aquele momento é preservado como resultado parcial.

#### Desenhista de Testes — Agent 2

1. Abra **Análises de US**.
2. Entre nos detalhes de uma US concluída.
3. Clique em **Enviar ao Desenhista de Testes**.
4. Confirme a análise de origem.
5. Clique em **Desenhar plano de testes**.
6. Acompanhe a identificação de gaps, casos e bloqueadores.
7. Ao concluir, o sistema abre o plano de testes.

Os planos ficam salvos em **Planos de Teste** e apresentam:

- cobertura nas seis categorias obrigatórias;
- matriz de rastreabilidade;
- gaps com severidade;
- casos recomendados;
- bloqueadores;
- ordem sugerida de implementação;
- cenários de frontend separados;
- relatório técnico.

Nesta primeira versão, o Agent 2 somente desenha e salva o plano. Ele não cria nem altera arquivos de automação.

## 9. Claude (Anthropic) para os Agents

A API executa os Agents de IA usando Claude, por um de dois caminhos (escolhido automaticamente):

- **Com `ANTHROPIC_API_KEY` configurada** (recomendado para staging/produção): usa a Messages API
  (`@anthropic-ai/sdk`) diretamente.
- **Sem `ANTHROPIC_API_KEY`** (bom para rodar localmente): usa o Claude Agent SDK
  (`@anthropic-ai/claude-agent-sdk`), que reaproveita a sessão do Claude Code já autenticada na
  máquina — não pede nenhuma chave, mas só funciona numa máquina com `claude` logado.

Para executar os Agents:

1. (opcional) gere uma chave de API em https://console.anthropic.com e configure `ANTHROPIC_API_KEY`
   no `.env` da API — sem ela, a API cai automaticamente para a sessão do Claude Code local;
2. mantenha a pasta `.claude/agents` no repositório — é de lá que a API carrega a definição (persona) de cada Agent;
3. o modelo padrão é `claude-opus-5` (`ANTHROPIC_MODEL_DEFAULT`), com esforço de raciocínio `high` (`AGENT_EFFORT_DEFAULT`, usado só no modo com API key).

Para forçar um dos dois caminhos manualmente, defina `AGENT_AUTH_MODE=api-key` ou
`AGENT_AUTH_MODE=claude-code-session` no `.env` (o padrão é `auto`, com a lógica acima).

O tempo limite padrão é de 15 minutos e pode ser alterado em `AGENT_TIMEOUT_MS`.

## 10. Atualizar uma instalação existente

Depois de baixar uma nova versão:

```bash
git pull
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

Em seguida, reinicie API e frontend.

## 11. Build de validação

```bash
npm run build:api
npm run build:web
```

Os dois comandos devem terminar sem erros antes de publicar uma alteração.

## 12. Solução de problemas

### A API não conecta ao PostgreSQL

- Confirme que o serviço PostgreSQL está iniciado.
- Verifique host, porta, usuário, senha e database em `DATABASE_URL`.
- Teste com `psql -h localhost -U nexus_api -d doublecheck`.
- Confirme que caracteres especiais da senha foram codificados na URL.

### Prisma informa que o Client está desatualizado

```bash
npm run db:generate
npm run build:api
```

### Existem migrations pendentes

```bash
npm run db:status
npm run db:migrate
```

### Porta 3000 ou 5173 em uso

Encerre a instância anterior ou altere `PORT` na API e ajuste `VITE_API_URL` no frontend.

### Login retorna usuário ou senha inválidos

Execute novamente:

```bash
npm run db:seed
```

Lembre-se de que o seed preserva senhas de usuários existentes. As credenciais da tabela de usuários padrão são garantidas para um banco novo criado com os valores padrão do `.env.example`.

### Agent não inicia

- Se `ANTHROPIC_API_KEY` estiver configurada no `.env`, confirme que é válida.
- Se `ANTHROPIC_API_KEY` **não** estiver configurada, confirme que a máquina tem uma sessão do Claude
  Code autenticada (rode `claude` no terminal e veja se abre sem pedir login).
- Confira se a API está em execução.
- Verifique se a pasta `.claude/agents` existe e contém a definição do Agent.
- Consulte o terminal da API para obter a mensagem completa (ela informa qual dos dois runtimes está ativo ao subir).

## 13. Portas utilizadas

| Serviço | Porta padrão |
|---|---:|
| PostgreSQL | `5432` |
| API NestJS | `3000` |
| Frontend Vite | `5173` |
| Prisma Studio | `5555` |
