import {
  PrismaClient,
  ProjetoStatus,
  TimeStatus,
  PessoaStatus,
  ProdutoStatus,
  PublicoAlvoStatus,
  ModuloStatus,
  FuncionalidadeStatus,
  JornadaStatus,
  RegraStatus,
  IntegracaoStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const PROJETOS_SEED = [
  {
    nome: 'Nexus — Configurador do Nexo',
    codigo: 'NEX-CFG',
    descricao:
      'Hub de setup onde se estrutura o conhecimento de projetos, times, pessoas e produtos que alimentará os agents do ecossistema Nexus.',
    objetivo: 'Organizar o conhecimento interno de forma estruturada antes de habilitar agents sobre cada produto.',
    areaNegocio: 'Produto',
    status: ProjetoStatus.Ativo,
    idiomas: ['Português'],
    dataInicio: new Date('2026-02-02'),
    responsavelPrincipal: 'Ronaldo Palhoni',
    observacoes: 'Piloto inicial do ecossistema Nexus — Sprint de Protótipos 01.',
    jiraRef: 'NEX-1',
    confluenceRef: 'Nexus 2.0 / Configurador do Nexo',
  },
  {
    nome: 'Onboarding Digital CPF/CNPJ',
    codigo: 'DBC-ONB',
    descricao: 'Fluxo de análise automatizada de CPF/CNPJ com score de crédito para o onboarding de clientes.',
    objetivo: 'Reduzir o tempo de aprovação de cadastro de cedentes e fundos.',
    areaNegocio: 'Operações',
    status: ProjetoStatus.Ativo,
    idiomas: ['Português', 'Espanhol'],
    dataInicio: new Date('2025-08-15'),
    responsavelPrincipal: 'Mariana Costa',
    observacoes: null,
    jiraRef: 'DBC-204',
    confluenceRef: 'DBC 2.0 / Onboarding',
  },
  {
    nome: 'Copiloto de Atendimento',
    codigo: 'NEX-COP',
    descricao: 'Assistente de IA para suporte interno, treinado sobre a documentação estruturada dos produtos.',
    objetivo: 'Diminuir o tempo de resposta a dúvidas recorrentes sobre os produtos internos.',
    areaNegocio: 'Tecnologia',
    status: ProjetoStatus.Planejamento,
    idiomas: ['Português', 'Inglês'],
    dataInicio: new Date('2026-05-01'),
    responsavelPrincipal: 'Felipe Andrade',
    observacoes: 'Depende da maturidade de conhecimento gerada pelo Configurador do Nexo.',
    jiraRef: 'NEX-12',
    confluenceRef: 'Nexus 2.0 / Copiloto',
  },
  {
    nome: 'Integração Jira–Confluence',
    codigo: 'NEX-INT',
    descricao:
      'Sincronização somente leitura de épicos e páginas de documentação para os cadastros de Projeto e Produto.',
    objetivo: 'Evitar retrabalho de documentação já existente no Jira/Confluence.',
    areaNegocio: 'Dados & IA',
    status: ProjetoStatus.Planejamento,
    idiomas: ['Português'],
    dataInicio: new Date('2026-06-01'),
    responsavelPrincipal: 'Camila Souza',
    observacoes: null,
    jiraRef: 'NEX-30',
    confluenceRef: 'Nexus 2.0 / Integrações',
  },
  {
    nome: 'Portal do Cliente 2.0',
    codigo: 'DBC-PORT',
    descricao: 'Redesenho do portal externo de acompanhamento de processos para clientes da Double Check.',
    objetivo: 'Melhorar a experiência de acompanhamento self-service.',
    areaNegocio: 'Comercial',
    status: ProjetoStatus.Inativo,
    idiomas: ['Português'],
    dataInicio: new Date('2024-11-01'),
    responsavelPrincipal: 'Bruno Lima',
    observacoes: 'Pausado até definição de nova prioridade comercial.',
    jiraRef: 'DBC-88',
    confluenceRef: 'DBC 2.0 / Portal',
  },
  {
    nome: 'Motor de Regras de Crédito',
    codigo: 'DBC-RGR',
    descricao:
      'Centralização das regras de elegibilidade e limite de crédito usadas nos produtos de Factor e Gestor.',
    objetivo: 'Ter uma única fonte de verdade para regras de negócio versionadas.',
    areaNegocio: 'Jurídico',
    status: ProjetoStatus.Ativo,
    idiomas: ['Português'],
    dataInicio: new Date('2025-03-10'),
    responsavelPrincipal: 'Ana Beatriz Ferreira',
    observacoes: null,
    jiraRef: 'DBC-150',
    confluenceRef: 'DBC 2.0 / Regras de Crédito',
  },
];

async function seedHistory(entityType: string, entityId: string, actorUserId: string, label = 'Registro criado') {
  await prisma.historyEntry.upsert({
    where: { id: `seed-history-${entityId}` },
    update: {},
    create: { id: `seed-history-${entityId}`, entityType, entityId, label, actorUserId },
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@nexus.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'NexusAdmin123!';
  const adminNome = process.env.SEED_ADMIN_NOME ?? 'Administrador do Piloto';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, nome: adminNome, passwordHash: await hash(adminPassword) },
  });
  console.log(`Usuário admin pronto: ${admin.email}`);

  const agentEmail = process.env.SEED_AGENT_EMAIL ?? 'agent_ia@teste.com';
  const agentPassword = process.env.SEED_AGENT_PASSWORD ?? 'Caete@1234';
  const agentNome = process.env.SEED_AGENT_NOME ?? 'Agent IA';
  const agentUser = await prisma.user.upsert({
    where: { email: agentEmail },
    update: { nome: agentNome, isActive: true },
    create: { email: agentEmail, nome: agentNome, passwordHash: await hash(agentPassword) },
  });
  console.log(`Usuário dos Agents pronto: ${agentUser.email}`);

  async function seedRows<T extends { id: string }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: { upsert: (args: { where: { id: string }; update: object; create: any }) => Promise<{ id: string }> },
    entityType: string,
    rows: T[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toData: (row: T) => any,
  ) {
    for (const row of rows) {
      const created = await model.upsert({ where: { id: row.id }, update: {}, create: toData(row) });
      await seedHistory(entityType, created.id, admin.id);
    }
    if (rows.length) console.log(`${rows.length} ${entityType} de exemplo prontos.`);
  }

  for (const seed of PROJETOS_SEED) {
    const projeto = await prisma.projeto.upsert({
      where: { codigo: seed.codigo },
      update: {},
      create: seed,
    });
    await prisma.historyEntry.upsert({
      where: { id: `seed-${projeto.id}` },
      update: {},
      create: {
        id: `seed-${projeto.id}`,
        entityType: 'Projeto',
        entityId: projeto.id,
        label: 'Projeto cadastrado',
        actorUserId: admin.id,
        createdAt: seed.dataInicio,
      },
    });
  }
  console.log(`${PROJETOS_SEED.length} projetos de exemplo prontos.`);

  const projetoNexus = await prisma.projeto.findUnique({ where: { codigo: 'NEX-CFG' } });
  if (projetoNexus) {
    const TIMES_SEED = [
      {
        id: 'seed-time-config-core',
        nome: 'Núcleo do Configurador',
        missao: 'Estruturar o conhecimento de projetos e produtos que alimenta os agents do Nexus.',
        descricao: 'Time responsável pela construção do Configurador do Nexo (Epics 0-4).',
        responsavelPrincipal: 'Ronaldo Palhoni',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack', 'Videoconferência'],
        status: TimeStatus.Ativo,
      },
      {
        id: 'seed-time-agents',
        nome: 'Agents & IA',
        missao: 'Projetar o comportamento dos agents que vão consumir a base de conhecimento.',
        descricao: 'Time formado após a maturidade do Configurador — ainda em estruturação.',
        responsavelPrincipal: 'Felipe Andrade',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack'],
        status: TimeStatus.Ativo,
      },
    ];
    for (const seed of TIMES_SEED) {
      const time = await prisma.time.upsert({
        where: { id: seed.id },
        update: {},
        create: { ...seed, projetoId: projetoNexus.id },
      });
      await prisma.historyEntry.upsert({
        where: { id: `seed-history-${time.id}` },
        update: {},
        create: { id: `seed-history-${time.id}`, entityType: 'Time', entityId: time.id, label: 'Registro criado', actorUserId: admin.id },
      });
    }
    console.log(`${TIMES_SEED.length} times de exemplo prontos.`);

    const timeNucleo = await prisma.time.findUnique({ where: { id: 'seed-time-config-core' } });
    const timeAgents = await prisma.time.findUnique({ where: { id: 'seed-time-agents' } });

    const PESSOAS_SEED = [
      {
        id: 'seed-pessoa-ronaldo',
        nome: 'Ronaldo Palhoni',
        emailCorporativo: 'ronaldo.palhoni@doublecheck.com.br',
        papel: 'Product Owner',
        cargo: 'Gerente de Produto',
        timeId: timeNucleo?.id,
        nivelDecisao: 'Estratégico',
        pessoaReferencia: true,
        status: PessoaStatus.Ativo,
      },
      {
        id: 'seed-pessoa-felipe',
        nome: 'Felipe Andrade',
        emailCorporativo: 'felipe.andrade@doublecheck.com.br',
        papel: 'Tech Lead',
        cargo: 'Engenheiro de Software',
        timeId: timeAgents?.id,
        nivelDecisao: 'Tático',
        pessoaReferencia: true,
        status: PessoaStatus.Ativo,
      },
      {
        id: 'seed-pessoa-camila',
        nome: 'Camila Souza',
        emailCorporativo: 'camila.souza@doublecheck.com.br',
        papel: 'Analista de Negócio',
        cargo: 'Analista de Negócio Sênior',
        timeId: timeNucleo?.id,
        nivelDecisao: 'Operacional',
        pessoaReferencia: false,
        status: PessoaStatus.Ativo,
      },
    ];
    for (const seed of PESSOAS_SEED) {
      const pessoa = await prisma.pessoa.upsert({
        where: { id: seed.id },
        update: {},
        create: { ...seed, projetoId: projetoNexus.id },
      });
      await prisma.historyEntry.upsert({
        where: { id: `seed-history-${pessoa.id}` },
        update: {},
        create: { id: `seed-history-${pessoa.id}`, entityType: 'Pessoa', entityId: pessoa.id, label: 'Registro criado', actorUserId: admin.id },
      });
    }
    console.log(`${PESSOAS_SEED.length} pessoas de exemplo prontas.`);

    const PRODUTOS_SEED = [
      {
        id: 'seed-produto-configurador',
        nome: 'Configurador do Nexo',
        nomeCurto: 'Configurador',
        codigo: 'CFG',
        descricao: 'Hub de cadastro estruturado de projetos, times, pessoas e produtos que alimenta os agents do Nexus.',
        objetivo: 'Estruturar o conhecimento interno antes de habilitar agents sobre cada produto.',
        problemaResolve: 'Hoje o conhecimento de produto vive espalhado entre Jira, Confluence e a cabeça das pessoas.',
        usuariosPrincipais: 'Product Owners, Analistas de Negócio e Tech Leads dos times internos.',
        areaNegocio: 'Produto',
        areasBeneficiadas: ['Produto', 'Tecnologia', 'Dados & IA'],
        timeResponsavelId: timeNucleo?.id,
        responsavelPrincipal: 'Ronaldo Palhoni',
        ambientes: ['Desenvolvimento', 'Homologação'],
        status: ProdutoStatus.Ativo,
      },
      {
        id: 'seed-produto-copiloto',
        nome: 'Copiloto de Atendimento',
        nomeCurto: 'Copiloto',
        codigo: 'COP',
        descricao: 'Assistente de IA para suporte interno, treinado sobre a documentação estruturada dos produtos.',
        objetivo: 'Diminuir o tempo de resposta a dúvidas recorrentes sobre os produtos internos.',
        problemaResolve: 'Times gastam tempo respondendo as mesmas perguntas sobre regras e funcionalidades já documentadas.',
        usuariosPrincipais: 'Times de suporte e atendimento interno.',
        areaNegocio: 'Tecnologia',
        areasBeneficiadas: ['Tecnologia', 'Operações'],
        timeResponsavelId: timeAgents?.id,
        responsavelPrincipal: 'Felipe Andrade',
        ambientes: ['Desenvolvimento'],
        status: ProdutoStatus.Planejamento,
      },
    ];
    for (const seed of PRODUTOS_SEED) {
      const produto = await prisma.produto.upsert({
        where: { id: seed.id },
        update: {},
        create: { ...seed, projetoId: projetoNexus.id },
      });
      await prisma.historyEntry.upsert({
        where: { id: `seed-history-${produto.id}` },
        update: {},
        create: { id: `seed-history-${produto.id}`, entityType: 'Produto', entityId: produto.id, label: 'Registro criado', actorUserId: admin.id },
      });
    }
    console.log(`${PRODUTOS_SEED.length} produtos de exemplo prontos.`);
  }

  // --- Onboarding Digital CPF/CNPJ (DBC-ONB) ---
  const projetoOnboarding = await prisma.projeto.findUnique({ where: { codigo: 'DBC-ONB' } });
  if (projetoOnboarding) {
    const TIMES_ONB = [
      {
        id: 'seed-time-squad-onboarding',
        nome: 'Squad Onboarding',
        missao: 'Entregar o fluxo de cadastro e análise de CPF/CNPJ.',
        descricao: 'Time responsável pela experiência de cadastro do cedente.',
        responsavelPrincipal: 'Mariana Costa',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack', 'Videoconferência'],
        status: TimeStatus.Ativo,
      },
      {
        id: 'seed-time-risco-compliance-onb',
        nome: 'Risco & Compliance Onboarding',
        missao: 'Definir regras de elegibilidade e score de crédito do onboarding.',
        descricao: 'Time responsável pelas regras de risco aplicadas no cadastro.',
        responsavelPrincipal: 'Juliana Ramos',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack', 'E-mail'],
        status: TimeStatus.Ativo,
      },
    ];
    for (const seed of TIMES_ONB) {
      const time = await prisma.time.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoOnboarding.id } });
      await seedHistory('Time', time.id, admin.id);
    }

    const PESSOAS_ONB = [
      { id: 'seed-pessoa-mariana', nome: 'Mariana Costa', emailCorporativo: 'mariana.costa@doublecheck.com.br', papel: 'Product Owner', cargo: 'Gerente de Produto', timeId: 'seed-time-squad-onboarding', nivelDecisao: 'Estratégico', pessoaReferencia: true, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-diego', nome: 'Diego Martins', emailCorporativo: 'diego.martins@doublecheck.com.br', papel: 'Tech Lead', cargo: 'Engenheiro de Software', timeId: 'seed-time-squad-onboarding', nivelDecisao: 'Tático', pessoaReferencia: false, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-juliana', nome: 'Juliana Ramos', emailCorporativo: 'juliana.ramos@doublecheck.com.br', papel: 'Analista de Risco', cargo: 'Analista de Risco Sênior', timeId: 'seed-time-risco-compliance-onb', nivelDecisao: 'Tático', pessoaReferencia: true, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-rafael', nome: 'Rafael Nogueira', emailCorporativo: 'rafael.nogueira@doublecheck.com.br', papel: 'Analista de Negócio', cargo: 'Analista de Negócio', timeId: 'seed-time-squad-onboarding', nivelDecisao: 'Operacional', pessoaReferencia: false, status: PessoaStatus.Ativo },
    ];
    for (const seed of PESSOAS_ONB) {
      const pessoa = await prisma.pessoa.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoOnboarding.id } });
      await seedHistory('Pessoa', pessoa.id, admin.id);
    }

    const PRODUTOS_ONB = [
      {
        id: 'seed-produto-cadastro-digital',
        nome: 'Cadastro Digital CPF/CNPJ',
        nomeCurto: 'Cadastro Digital',
        codigo: 'CAD',
        descricao: 'Fluxo digital de cadastro e validação documental de cedentes pessoa física e jurídica.',
        objetivo: 'Reduzir o tempo de aprovação de cadastro de cedentes e fundos.',
        problemaResolve: 'Cadastro manual gera retrabalho e demora na análise documental.',
        usuariosPrincipais: 'Cedentes pessoa física e jurídica, analistas de backoffice.',
        areaNegocio: 'Operações',
        areasBeneficiadas: ['Operações', 'Comercial'],
        timeResponsavelId: 'seed-time-squad-onboarding',
        responsavelPrincipal: 'Mariana Costa',
        ambientes: ['Produção', 'Homologação'],
        status: ProdutoStatus.Ativo,
      },
      {
        id: 'seed-produto-score-credito',
        nome: 'Score de Crédito',
        nomeCurto: 'Score',
        codigo: 'SCR',
        descricao: 'Motor de cálculo de score de crédito usado na decisão de aprovação de cadastro.',
        objetivo: 'Padronizar e explicar a decisão de risco de cada cedente.',
        problemaResolve: 'Decisões de risco eram tomadas de forma manual e pouco rastreável.',
        usuariosPrincipais: 'Comitê de crédito, sistemas internos de decisão.',
        areaNegocio: 'Operações',
        areasBeneficiadas: ['Operações', 'Jurídico'],
        timeResponsavelId: 'seed-time-risco-compliance-onb',
        responsavelPrincipal: 'Juliana Ramos',
        ambientes: ['Produção', 'Homologação'],
        status: ProdutoStatus.Ativo,
      },
    ];
    for (const seed of PRODUTOS_ONB) {
      const produto = await prisma.produto.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoOnboarding.id } });
      await seedHistory('Produto', produto.id, admin.id);
    }
    console.log('Onboarding Digital CPF/CNPJ: times, pessoas e produtos prontos.');
  }

  // --- Motor de Regras de Crédito (DBC-RGR) ---
  const projetoRegrasCredito = await prisma.projeto.findUnique({ where: { codigo: 'DBC-RGR' } });
  if (projetoRegrasCredito) {
    const TIMES_RGR = [
      {
        id: 'seed-time-regras-compliance',
        nome: 'Regras & Compliance Jurídico',
        missao: 'Garantir que as regras de crédito reflitam a política jurídica vigente.',
        descricao: 'Time responsável pela definição de negócio das regras de elegibilidade e limite.',
        responsavelPrincipal: 'Ana Beatriz Ferreira',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['E-mail', 'Reunião presencial'],
        status: TimeStatus.Ativo,
      },
      {
        id: 'seed-time-engenharia-regras',
        nome: 'Engenharia de Regras',
        missao: 'Implementar e versionar as regras de crédito no motor.',
        descricao: 'Time responsável pela implementação técnica do motor de regras.',
        responsavelPrincipal: 'Thiago Mendes',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack'],
        status: TimeStatus.Ativo,
      },
    ];
    for (const seed of TIMES_RGR) {
      const time = await prisma.time.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoRegrasCredito.id } });
      await seedHistory('Time', time.id, admin.id);
    }

    const PESSOAS_RGR = [
      { id: 'seed-pessoa-ana-beatriz', nome: 'Ana Beatriz Ferreira', emailCorporativo: 'ana.ferreira@doublecheck.com.br', papel: 'Product Owner', cargo: 'Gerente Jurídico', timeId: 'seed-time-regras-compliance', nivelDecisao: 'Estratégico', pessoaReferencia: true, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-thiago', nome: 'Thiago Mendes', emailCorporativo: 'thiago.mendes@doublecheck.com.br', papel: 'Tech Lead', cargo: 'Engenheiro de Software', timeId: 'seed-time-engenharia-regras', nivelDecisao: 'Tático', pessoaReferencia: true, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-patricia', nome: 'Patrícia Lopes', emailCorporativo: 'patricia.lopes@doublecheck.com.br', papel: 'Analista Jurídica', cargo: 'Analista Jurídica Sênior', timeId: 'seed-time-regras-compliance', nivelDecisao: 'Tático', pessoaReferencia: false, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-gustavo', nome: 'Gustavo Rocha', emailCorporativo: 'gustavo.rocha@doublecheck.com.br', papel: 'Engenheiro de Regras', cargo: 'Engenheiro de Software', timeId: 'seed-time-engenharia-regras', nivelDecisao: 'Operacional', pessoaReferencia: false, status: PessoaStatus.Ativo },
    ];
    for (const seed of PESSOAS_RGR) {
      const pessoa = await prisma.pessoa.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoRegrasCredito.id } });
      await seedHistory('Pessoa', pessoa.id, admin.id);
    }

    const PRODUTOS_RGR = [
      {
        id: 'seed-produto-motor-elegibilidade',
        nome: 'Motor de Elegibilidade',
        nomeCurto: 'Elegibilidade',
        codigo: 'ELG',
        descricao: 'Avalia se um cedente ou fundo é elegível para operar, aplicando regras setoriais e restritivas.',
        objetivo: 'Ter uma única fonte de verdade para elegibilidade, versionada e auditável.',
        problemaResolve: 'Critérios de elegibilidade viviam em planilhas e no conhecimento tácito do jurídico.',
        usuariosPrincipais: 'Fundos de investimento, mesa de operações de crédito.',
        areaNegocio: 'Jurídico',
        areasBeneficiadas: ['Jurídico', 'Operações'],
        timeResponsavelId: 'seed-time-regras-compliance',
        responsavelPrincipal: 'Ana Beatriz Ferreira',
        ambientes: ['Produção', 'Homologação'],
        status: ProdutoStatus.Ativo,
      },
      {
        id: 'seed-produto-limites-credito',
        nome: 'Limites de Crédito',
        nomeCurto: 'Limites',
        codigo: 'LIM',
        descricao: 'Calcula, revisa e audita os limites de crédito concedidos a cada cedente.',
        objetivo: 'Padronizar o cálculo de limite e sua revisão periódica.',
        problemaResolve: 'Limites eram calculados manualmente e revisados sem periodicidade definida.',
        usuariosPrincipais: 'Mesa de operações de crédito, auditoria interna.',
        areaNegocio: 'Jurídico',
        areasBeneficiadas: ['Jurídico', 'Operações'],
        timeResponsavelId: 'seed-time-engenharia-regras',
        responsavelPrincipal: 'Thiago Mendes',
        ambientes: ['Produção'],
        status: ProdutoStatus.Ativo,
      },
    ];
    for (const seed of PRODUTOS_RGR) {
      const produto = await prisma.produto.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoRegrasCredito.id } });
      await seedHistory('Produto', produto.id, admin.id);
    }
    console.log('Motor de Regras de Crédito: times, pessoas e produtos prontos.');
  }

  // --- Projetos leves: um time, algumas pessoas e um produto cada ---
  const projetoCopiloto = await prisma.projeto.findUnique({ where: { codigo: 'NEX-COP' } });
  if (projetoCopiloto) {
    await prisma.time.upsert({
      where: { id: 'seed-time-squad-copiloto-comercial' },
      update: {},
      create: {
        id: 'seed-time-squad-copiloto-comercial',
        nome: 'Squad Copiloto Comercial',
        missao: 'Explorar um copiloto de IA para apoiar vendedores externos.',
        responsavelPrincipal: 'Lucas Tavares',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack'],
        status: TimeStatus.Ativo,
        projetoId: projetoCopiloto.id,
      },
    });
    await seedHistory('Time', 'seed-time-squad-copiloto-comercial', admin.id);

    const PESSOAS_COP = [
      { id: 'seed-pessoa-lucas', nome: 'Lucas Tavares', emailCorporativo: 'lucas.tavares@doublecheck.com.br', papel: 'Product Owner', cargo: 'Gerente de Produto', timeId: 'seed-time-squad-copiloto-comercial', nivelDecisao: 'Estratégico', pessoaReferencia: true, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-beatriz', nome: 'Beatriz Nunes', emailCorporativo: 'beatriz.nunes@doublecheck.com.br', papel: 'Analista de Negócio', cargo: 'Analista de Negócio', timeId: 'seed-time-squad-copiloto-comercial', nivelDecisao: 'Operacional', pessoaReferencia: false, status: PessoaStatus.Ativo },
    ];
    for (const seed of PESSOAS_COP) {
      const pessoa = await prisma.pessoa.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoCopiloto.id } });
      await seedHistory('Pessoa', pessoa.id, admin.id);
    }

    const produtoCopCom = await prisma.produto.upsert({
      where: { id: 'seed-produto-copiloto-comercial' },
      update: {},
      create: {
        id: 'seed-produto-copiloto-comercial',
        nome: 'Copiloto Comercial',
        nomeCurto: 'Copiloto Comercial',
        codigo: 'COP-COM',
        descricao: 'Variante do Copiloto de Atendimento explorada para apoiar vendedores externos em ligações comerciais.',
        objetivo: 'Sugerir argumentos e identificar objeções em tempo real durante o atendimento comercial.',
        problemaResolve: 'Vendedores novos demoram a aprender os argumentos certos para cada objeção do cliente.',
        usuariosPrincipais: 'Vendedores externos e gerentes comerciais.',
        areaNegocio: 'Comercial',
        areasBeneficiadas: ['Comercial'],
        timeResponsavelId: 'seed-time-squad-copiloto-comercial',
        responsavelPrincipal: 'Lucas Tavares',
        ambientes: ['Desenvolvimento'],
        status: ProdutoStatus.Planejamento,
        projetoId: projetoCopiloto.id,
      },
    });
    await seedHistory('Produto', produtoCopCom.id, admin.id);
    console.log('Copiloto de Atendimento (projeto): time, pessoas e produto prontos.');
  }

  const projetoIntegracaoJira = await prisma.projeto.findUnique({ where: { codigo: 'NEX-INT' } });
  if (projetoIntegracaoJira) {
    await prisma.time.upsert({
      where: { id: 'seed-time-squad-integracoes-nexus' },
      update: {},
      create: {
        id: 'seed-time-squad-integracoes-nexus',
        nome: 'Squad Integrações Nexus',
        missao: 'Sincronizar documentação já existente no Jira e Confluence com os cadastros do Nexus.',
        responsavelPrincipal: 'Eduardo Vieira',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['Slack'],
        status: TimeStatus.Ativo,
        projetoId: projetoIntegracaoJira.id,
      },
    });
    await seedHistory('Time', 'seed-time-squad-integracoes-nexus', admin.id);

    const PESSOAS_INT = [
      { id: 'seed-pessoa-eduardo', nome: 'Eduardo Vieira', emailCorporativo: 'eduardo.vieira@doublecheck.com.br', papel: 'Product Owner', cargo: 'Gerente de Produto', timeId: 'seed-time-squad-integracoes-nexus', nivelDecisao: 'Estratégico', pessoaReferencia: true, status: PessoaStatus.Ativo },
      { id: 'seed-pessoa-larissa', nome: 'Larissa Freitas', emailCorporativo: 'larissa.freitas@doublecheck.com.br', papel: 'Engenheira de Software', cargo: 'Engenheira de Software', timeId: 'seed-time-squad-integracoes-nexus', nivelDecisao: 'Operacional', pessoaReferencia: false, status: PessoaStatus.Ativo },
    ];
    for (const seed of PESSOAS_INT) {
      const pessoa = await prisma.pessoa.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoIntegracaoJira.id } });
      await seedHistory('Pessoa', pessoa.id, admin.id);
    }

    const produtoSync = await prisma.produto.upsert({
      where: { id: 'seed-produto-sincronizador' },
      update: {},
      create: {
        id: 'seed-produto-sincronizador',
        nome: 'Sincronizador Jira-Confluence',
        nomeCurto: 'Sincronizador',
        codigo: 'SYNC',
        descricao: 'Sincronização somente leitura de épicos do Jira e páginas do Confluence para os cadastros de Projeto e Produto.',
        objetivo: 'Evitar retrabalho de documentação já existente no Jira/Confluence.',
        problemaResolve: 'Times já documentam no Jira/Confluence e precisam recadastrar tudo de novo no Nexus.',
        usuariosPrincipais: 'Product Owners e Tech Writers.',
        areaNegocio: 'Dados & IA',
        areasBeneficiadas: ['Dados & IA', 'Produto'],
        timeResponsavelId: 'seed-time-squad-integracoes-nexus',
        responsavelPrincipal: 'Eduardo Vieira',
        ambientes: ['Desenvolvimento'],
        status: ProdutoStatus.Planejamento,
        projetoId: projetoIntegracaoJira.id,
      },
    });
    await seedHistory('Produto', produtoSync.id, admin.id);
    console.log('Integração Jira-Confluence: time, pessoas e produto prontos.');
  }

  const projetoPortal = await prisma.projeto.findUnique({ where: { codigo: 'DBC-PORT' } });
  if (projetoPortal) {
    await prisma.time.upsert({
      where: { id: 'seed-time-squad-portal-cliente' },
      update: {},
      create: {
        id: 'seed-time-squad-portal-cliente',
        nome: 'Squad Portal do Cliente',
        missao: 'Manter o portal externo de acompanhamento de processos para clientes.',
        responsavelPrincipal: 'Bruno Lima',
        paisesAtuacao: ['Brasil'],
        canaisComunicacao: ['E-mail'],
        status: TimeStatus.Inativo,
        projetoId: projetoPortal.id,
      },
    });
    await seedHistory('Time', 'seed-time-squad-portal-cliente', admin.id);

    const PESSOAS_PORT = [
      { id: 'seed-pessoa-bruno', nome: 'Bruno Lima', emailCorporativo: 'bruno.lima@doublecheck.com.br', papel: 'Product Owner', cargo: 'Gerente de Produto', timeId: 'seed-time-squad-portal-cliente', nivelDecisao: 'Estratégico', pessoaReferencia: true, status: PessoaStatus.Inativo },
      { id: 'seed-pessoa-fernanda', nome: 'Fernanda Dias', emailCorporativo: 'fernanda.dias@doublecheck.com.br', papel: 'Designer', cargo: 'Designer de Produto', timeId: 'seed-time-squad-portal-cliente', nivelDecisao: 'Operacional', pessoaReferencia: false, status: PessoaStatus.Inativo },
    ];
    for (const seed of PESSOAS_PORT) {
      const pessoa = await prisma.pessoa.upsert({ where: { id: seed.id }, update: {}, create: { ...seed, projetoId: projetoPortal.id } });
      await seedHistory('Pessoa', pessoa.id, admin.id);
    }

    const produtoPortal = await prisma.produto.upsert({
      where: { id: 'seed-produto-portal-cliente' },
      update: {},
      create: {
        id: 'seed-produto-portal-cliente',
        nome: 'Portal do Cliente',
        nomeCurto: 'Portal',
        codigo: 'PORT',
        descricao: 'Portal externo de acompanhamento de processos para clientes da Double Check.',
        objetivo: 'Melhorar a experiência de acompanhamento self-service.',
        problemaResolve: 'Clientes ligavam para saber o status do processo por falta de visibilidade self-service.',
        usuariosPrincipais: 'Clientes pessoa física e jurídica.',
        areaNegocio: 'Comercial',
        areasBeneficiadas: ['Comercial'],
        timeResponsavelId: 'seed-time-squad-portal-cliente',
        responsavelPrincipal: 'Bruno Lima',
        ambientes: ['Produção'],
        status: ProdutoStatus.Inativo,
        projetoId: projetoPortal.id,
      },
    });
    await seedHistory('Produto', produtoPortal.id, admin.id);
    console.log('Portal do Cliente 2.0: time, pessoas e produto prontos.');
  }

  // --- Limpeza de registros de teste criados via curl durante a validação dos Epics 5-11
  // (ids específicos e conhecidos — nunca afeta dados criados pelo usuário via UI). ---
  await prisma.publicoAlvo.deleteMany({ where: { id: { in: ['cmsiz7q3t0000nwvpvkce619x'] } } });
  await prisma.modulo.deleteMany({ where: { id: { in: ['cmsizujgd00005gvppkk8rbk3', 'cmsizujh600025gvp26dz6tnr'] } } });
  await prisma.funcionalidade.deleteMany({ where: { id: { in: ['cmsj060pw0000x8vp597q3bjy'] } } });
  await prisma.jornada.deleteMany({ where: { id: { in: ['cmsj0ns1q0000tkvpo6wltkj8'] } } });
  await prisma.regra.deleteMany({ where: { id: { in: ['cmsj162370000tgvp2riokcuy', 'cmsj17cw20002tgvpnaecj0tr'] } } });
  await prisma.integracao.deleteMany({ where: { id: { in: ['cmsj1oquc00000gvpncxjd7ti'] } } });
  // "Produto Teste Curl" — resíduo de uma sessão anterior (antes do Epic 5), sem sub-entidades associadas.
  await prisma.produto.deleteMany({ where: { id: { in: ['cmshzef4h0000w4vpneibxvcp'] } } });

  // --- Público-alvo, para os 9 produtos cadastrados acima ---
  const PUBLICOS_ALVO_SEED = [
    {
      id: 'seed-pa-cfg-pos', produtoId: 'seed-produto-configurador', nome: 'Product Owners de Produto Interno',
      perfil: 'Donos de produto que precisam estruturar conhecimento de forma consistente.', tipoUsuario: 'Usuário Interno',
      descricao: 'POs responsáveis por manter o cadastro de seus produtos atualizado no Configurador.',
      necessidades: ['Ter um lugar único para documentar o produto', 'Enxergar lacunas de documentação'],
      dores: ['Conhecimento espalhado entre Jira, Confluence e a cabeça das pessoas', 'Retrabalho ao explicar o mesmo produto para pessoas novas'],
      objetivos: ['Reduzir tempo de onboarding de novos membros do time', 'Preparar a base para os futuros agents de IA'],
      frequenciaUso: 'Semanal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cfg-techleads', produtoId: 'seed-produto-configurador', nome: 'Tech Leads dos Times Internos',
      perfil: 'Responsáveis técnicos que precisam entender a estrutura de dados de cada produto.', tipoUsuario: 'Usuário Interno',
      descricao: 'Tech leads que consultam o cadastro para tomar decisões de arquitetura.',
      necessidades: ['Consultar rapidamente módulos e funcionalidades já existentes'],
      dores: ['Perder tempo perguntando no Slack o que já está documentado'],
      objetivos: ['Diminuir dependência de conhecimento tácito'],
      frequenciaUso: 'Semanal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cfg-agents', produtoId: 'seed-produto-configurador', nome: 'Agents de IA (consumidores futuros)',
      perfil: 'Sistemas automatizados que vão consumir a base estruturada.', tipoUsuario: 'Outro',
      descricao: 'Consumidores não-humanos da base de conhecimento, via API.',
      necessidades: ['Dados estruturados e consistentes', 'Indicadores de maturidade por produto'],
      dores: ['Dados incompletos ou desatualizados geram respostas erradas'],
      objetivos: ['Responder perguntas de negócio com base confiável'],
      frequenciaUso: 'Diária', canaisUtilizados: ['API'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cop-suporte', produtoId: 'seed-produto-copiloto', nome: 'Times de Suporte Interno',
      perfil: 'Times que respondem dúvidas recorrentes sobre os produtos internos.', tipoUsuario: 'Usuário Interno',
      descricao: 'Equipes de suporte que usam o copiloto para responder mais rápido.',
      necessidades: ['Respostas rápidas e confiáveis'], dores: ['Responder a mesma pergunta várias vezes por semana'],
      objetivos: ['Reduzir tempo médio de resposta'], frequenciaUso: 'Diária', canaisUtilizados: ['Web', 'WhatsApp'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cop-atendentes', produtoId: 'seed-produto-copiloto', nome: 'Atendentes de Primeira Linha',
      perfil: 'Atendentes que lidam diretamente com o usuário final.', tipoUsuario: 'Usuário Interno',
      descricao: 'Primeira linha de atendimento que escala para especialistas quando necessário.',
      necessidades: ['Saber quando escalar para um humano'], dores: ['Falta de confiança na resposta automática'],
      objetivos: ['Resolver mais casos sem precisar escalar'], frequenciaUso: 'Diária', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cad-pf', produtoId: 'seed-produto-cadastro-digital', nome: 'Cedentes Pessoa Física',
      perfil: 'Pessoas físicas que solicitam antecipação de recebíveis.', tipoUsuario: 'Cliente Final',
      descricao: 'Usuários finais que preenchem o cadastro digital pela primeira vez.',
      necessidades: ['Cadastro rápido e sem burocracia', 'Entender por que um documento foi rejeitado'],
      dores: ['Upload de documento falha sem explicação clara', 'Processo de análise demorado'],
      objetivos: ['Ser aprovado no mesmo dia'], frequenciaUso: 'Esporádica', canaisUtilizados: ['Web', 'Aplicativo Mobile'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cad-pj', produtoId: 'seed-produto-cadastro-digital', nome: 'Cedentes Pessoa Jurídica',
      perfil: 'Empresas que solicitam antecipação de recebíveis via fundo.', tipoUsuario: 'Cliente Final',
      descricao: 'Usuários jurídicos com documentação mais complexa (contrato social, procuração).',
      necessidades: ['Cadastrar múltiplos sócios e procuradores'], dores: ['Documentação societária confunde o fluxo de PF'],
      objetivos: ['Ter um fluxo dedicado para PJ'], frequenciaUso: 'Esporádica', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-cad-backoffice', produtoId: 'seed-produto-cadastro-digital', nome: 'Analistas de Backoffice',
      perfil: 'Analistas que revisam cadastros pendentes de aprovação manual.', tipoUsuario: 'Usuário Interno',
      descricao: 'Time interno que resolve exceções que a automação não consegue tratar.',
      necessidades: ['Fila priorizada de pendências', 'Histórico completo do cadastro'],
      dores: ['Falta de contexto de por que o sistema não aprovou automaticamente'],
      objetivos: ['Reduzir tempo de análise manual'], frequenciaUso: 'Diária', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-scr-comite', produtoId: 'seed-produto-score-credito', nome: 'Comitê de Crédito',
      perfil: 'Grupo que decide exceções e revisa a política de score.', tipoUsuario: 'Usuário Interno',
      descricao: 'Comitê que se reúne periodicamente para revisar o modelo de score.',
      necessidades: ['Relatórios de distribuição de score'], dores: ['Falta de explicabilidade do modelo atual'],
      objetivos: ['Revisar o modelo com base em dados, não em percepção'], frequenciaUso: 'Mensal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-scr-sistemas', produtoId: 'seed-produto-score-credito', nome: 'Sistemas Consumidores Internos',
      perfil: 'Sistemas internos (Cadastro Digital, Motor de Elegibilidade) que consultam o score.', tipoUsuario: 'Outro',
      descricao: 'Consumidores automatizados via API.',
      necessidades: ['Resposta rápida e disponível'], dores: ['Latência alta trava o fluxo de cadastro'],
      objetivos: ['SLA de resposta abaixo de 2 segundos'], frequenciaUso: 'Diária', canaisUtilizados: ['API'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-elg-fundos', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Fundos de Investimento',
      perfil: 'Fundos que definem sua própria política de elegibilidade sobre a base padrão.', tipoUsuario: 'Parceiro',
      descricao: 'Fundos que operam com cedentes e precisam de regras específicas por setor.',
      necessidades: ['Parametrizar exceções por fundo'], dores: ['Regra genérica demais para o apetite de risco do fundo'],
      objetivos: ['Ter controle sobre exceções aprovadas'], frequenciaUso: 'Mensal', canaisUtilizados: ['E-mail', 'Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-elg-mesa', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Mesa de Operações de Crédito',
      perfil: 'Time que opera o dia a dia das decisões de elegibilidade.', tipoUsuario: 'Usuário Interno',
      descricao: 'Mesa que acompanha decisões e escala exceções para o comitê.',
      necessidades: ['Visão clara do motivo da inelegibilidade'], dores: ['Decisão pouco transparente gera retrabalho de explicação ao cliente'],
      objetivos: ['Resolver dúvida do cliente sem precisar escalar'], frequenciaUso: 'Diária', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-lim-mesa', produtoId: 'seed-produto-limites-credito', nome: 'Mesa de Operações de Crédito',
      perfil: 'Time que acompanha e ajusta limites concedidos.', tipoUsuario: 'Usuário Interno',
      descricao: 'Mesa que revisa limites quando o cliente solicita aumento.',
      necessidades: ['Simular novo limite antes de aprovar'], dores: ['Cálculo manual de limite é lento'],
      objetivos: ['Responder solicitação de aumento no mesmo dia'], frequenciaUso: 'Diária', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-lim-auditoria', produtoId: 'seed-produto-limites-credito', nome: 'Auditoria Interna',
      perfil: 'Time de auditoria que revisa a conformidade dos limites concedidos.', tipoUsuario: 'Usuário Interno',
      descricao: 'Auditoria que verifica trimestralmente amostras de limites.',
      necessidades: ['Trilha completa de cálculo e revisões de limite'], dores: ['Falta de histórico auditável de mudanças de limite'],
      objetivos: ['Fechar auditoria trimestral sem pendências'], frequenciaUso: 'Quinzenal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-copcom-vendedores', produtoId: 'seed-produto-copiloto-comercial', nome: 'Vendedores Externos',
      perfil: 'Vendedores em campo que atendem clientes por telefone.', tipoUsuario: 'Usuário Interno',
      descricao: 'Vendedores que recebem sugestões em tempo real durante a ligação.',
      necessidades: ['Sugestão de argumento sem atrapalhar a ligação'], dores: ['Não saber como responder a uma objeção nova'],
      objetivos: ['Fechar mais vendas na primeira ligação'], frequenciaUso: 'Diária', canaisUtilizados: ['Telefone', 'Aplicativo Mobile'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-copcom-gerentes', produtoId: 'seed-produto-copiloto-comercial', nome: 'Gerentes Comerciais',
      perfil: 'Gerentes que acompanham a performance dos vendedores.', tipoUsuario: 'Usuário Interno',
      descricao: 'Gerentes que usam os dados de objeção para treinar o time.',
      necessidades: ['Relatório de objeções mais frequentes'], dores: ['Não saber por que um vendedor específico converte menos'],
      objetivos: ['Treinar o time com base em dados reais'], frequenciaUso: 'Semanal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-sync-pos', produtoId: 'seed-produto-sincronizador', nome: 'Product Owners',
      perfil: 'POs que já documentam épicos no Jira.', tipoUsuario: 'Usuário Interno',
      descricao: 'POs que não querem recadastrar o que já existe no Jira.',
      necessidades: ['Sincronização automática e confiável'], dores: ['Manter duas fontes de verdade desatualizadas'],
      objetivos: ['Documentar uma vez só'], frequenciaUso: 'Semanal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-sync-writers', produtoId: 'seed-produto-sincronizador', nome: 'Tech Writers',
      perfil: 'Escritores técnicos que mantêm páginas no Confluence.', tipoUsuario: 'Usuário Interno',
      descricao: 'Tech writers que precisam que a documentação apareça também no Nexus.',
      necessidades: ['Ver o conteúdo do Confluence refletido sem reescrever'], dores: ['Divergência entre Confluence e Nexus'],
      objetivos: ['Ter uma única fonte de documentação'], frequenciaUso: 'Semanal', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-port-pj', produtoId: 'seed-produto-portal-cliente', nome: 'Clientes Pessoa Jurídica',
      perfil: 'Empresas que acompanham seus processos de crédito pelo portal.', tipoUsuario: 'Cliente Final',
      descricao: 'Clientes PJ que consultam status e documentos.',
      necessidades: ['Ver status do processo sem ligar para o suporte'], dores: ['Falta de visibilidade sobre andamento do processo'],
      objetivos: ['Resolver dúvida sem precisar de atendimento humano'], frequenciaUso: 'Esporádica', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
    {
      id: 'seed-pa-port-pf', produtoId: 'seed-produto-portal-cliente', nome: 'Clientes Pessoa Física',
      perfil: 'Pessoas físicas que acompanham seus processos de crédito.', tipoUsuario: 'Cliente Final',
      descricao: 'Clientes PF que consultam status e baixam documentos assinados.',
      necessidades: ['Baixar documento assinado facilmente'], dores: ['Não lembrar onde está o documento assinado'],
      objetivos: ['Acessar tudo em um único lugar'], frequenciaUso: 'Esporádica', canaisUtilizados: ['Web'], paisesOndeSeAplica: ['Brasil'],
    },
  ];
  await seedRows(prisma.publicoAlvo, 'PublicoAlvo', PUBLICOS_ALVO_SEED, (p) => ({
    id: p.id, produtoId: p.produtoId, nome: p.nome, status: PublicoAlvoStatus.Ativo, perfil: p.perfil, tipoUsuario: p.tipoUsuario,
    descricao: p.descricao, necessidades: p.necessidades, dores: p.dores, objetivos: p.objetivos, frequenciaUso: p.frequenciaUso,
    canaisUtilizados: p.canaisUtilizados, paisesOndeSeAplica: p.paisesOndeSeAplica,
  }));

  // --- Módulos, para os 9 produtos ---
  const MODULOS_SEED = [
    { id: 'seed-mod-cfg-setup-proj', produtoId: 'seed-produto-configurador', nome: 'Setup de Projetos', codigo: 'SETUP-PROJ', ordemExibicao: 1, descricao: 'Cadastro estruturado de Projetos, topo da hierarquia.', objetivo: 'Padronizar a criação de um novo Projeto.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-mod-cfg-setup-time', produtoId: 'seed-produto-configurador', nome: 'Setup de Times e Pessoas', codigo: 'SETUP-TIME', ordemExibicao: 2, descricao: 'Cadastro de Times e Pessoas dentro de um Projeto.', objetivo: 'Estruturar quem faz parte de cada Projeto.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-mod-cfg-setup-prod', produtoId: 'seed-produto-configurador', nome: 'Setup de Produtos', codigo: 'SETUP-PROD', ordemExibicao: 3, descricao: 'Cadastro de Produtos e suas sub-entidades.', objetivo: 'Estruturar o conhecimento de cada Produto.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-mod-cfg-maturidade', produtoId: 'seed-produto-configurador', nome: 'Maturidade e Indicadores', codigo: 'MATURIDADE', ordemExibicao: 4, descricao: 'Indicadores agregados de completude do cadastro por Produto.', objetivo: 'Saber quando um Produto está pronto para os agents.', responsavelPrincipal: 'Felipe Andrade' },

    { id: 'seed-mod-cop-ingestao', produtoId: 'seed-produto-copiloto', nome: 'Ingestão de Conhecimento', codigo: 'INGESTAO', ordemExibicao: 1, descricao: 'Indexação da documentação estruturada do Configurador.', objetivo: 'Manter a base de conhecimento do copiloto atualizada.', responsavelPrincipal: 'Felipe Andrade' },
    { id: 'seed-mod-cop-motor-qa', produtoId: 'seed-produto-copiloto', nome: 'Motor de Perguntas e Respostas', codigo: 'MOTOR-QA', ordemExibicao: 2, descricao: 'Recebe a pergunta em linguagem natural e busca a resposta na base.', objetivo: 'Responder dúvidas recorrentes automaticamente.', responsavelPrincipal: 'Felipe Andrade' },
    { id: 'seed-mod-cop-feedback', produtoId: 'seed-produto-copiloto', nome: 'Feedback e Melhoria Contínua', codigo: 'FEEDBACK', ordemExibicao: 3, descricao: 'Coleta feedback sobre a qualidade das respostas.', objetivo: 'Melhorar a precisão do copiloto ao longo do tempo.', responsavelPrincipal: 'Felipe Andrade' },

    { id: 'seed-mod-cad-documentos', produtoId: 'seed-produto-cadastro-digital', nome: 'Cadastro de Documentos', codigo: 'DOCUMENTOS', ordemExibicao: 1, descricao: 'Upload e leitura dos documentos do cedente.', objetivo: 'Coletar os documentos necessários para análise.', responsavelPrincipal: 'Diego Martins' },
    { id: 'seed-mod-cad-identidade', produtoId: 'seed-produto-cadastro-digital', nome: 'Validação de Identidade', codigo: 'IDENTIDADE', ordemExibicao: 2, descricao: 'Confirma que o cedente é quem diz ser.', objetivo: 'Reduzir fraude de identidade no cadastro.', responsavelPrincipal: 'Diego Martins' },
    { id: 'seed-mod-cad-bureaus', produtoId: 'seed-produto-cadastro-digital', nome: 'Consulta a Bureaus', codigo: 'BUREAUS', ordemExibicao: 3, descricao: 'Consulta a fontes externas de dados cadastrais.', objetivo: 'Enriquecer o cadastro com dados de bureaus.', responsavelPrincipal: 'Rafael Nogueira' },
    { id: 'seed-mod-cad-aprovacao', produtoId: 'seed-produto-cadastro-digital', nome: 'Aprovação Manual', codigo: 'APROVACAO', ordemExibicao: 4, descricao: 'Fila de análise manual para casos que a automação não resolve.', objetivo: 'Tratar exceções do fluxo automático.', responsavelPrincipal: 'Rafael Nogueira' },

    { id: 'seed-mod-scr-motor', produtoId: 'seed-produto-score-credito', nome: 'Motor de Score', codigo: 'MOTOR-SCORE', ordemExibicao: 1, descricao: 'Calcula o score de crédito do cedente.', objetivo: 'Gerar uma nota de risco padronizada.', responsavelPrincipal: 'Juliana Ramos' },
    { id: 'seed-mod-scr-historico', produtoId: 'seed-produto-score-credito', nome: 'Histórico de Score', codigo: 'HISTORICO-SCORE', ordemExibicao: 2, descricao: 'Guarda o histórico de scores calculados por cedente.', objetivo: 'Permitir auditoria e comparação ao longo do tempo.', responsavelPrincipal: 'Juliana Ramos' },
    { id: 'seed-mod-scr-parametros', produtoId: 'seed-produto-score-credito', nome: 'Parâmetros do Modelo', codigo: 'PARAMETROS', ordemExibicao: 3, descricao: 'Configuração dos pesos usados no cálculo do score.', objetivo: 'Permitir ajuste do modelo sem alterar código.', responsavelPrincipal: 'Juliana Ramos' },

    { id: 'seed-mod-elg-regras', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Regras de Elegibilidade', codigo: 'REGRAS-ELEGIBILIDADE', ordemExibicao: 1, descricao: 'Avalia se o cedente/fundo é elegível para operar.', objetivo: 'Aplicar critérios setoriais e restritivos.', responsavelPrincipal: 'Ana Beatriz Ferreira' },
    { id: 'seed-mod-elg-excecoes', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Exceções Cadastrais', codigo: 'EXCECOES', ordemExibicao: 2, descricao: 'Registra exceções aprovadas pelo comitê.', objetivo: 'Permitir flexibilidade controlada às regras padrão.', responsavelPrincipal: 'Ana Beatriz Ferreira' },
    { id: 'seed-mod-elg-auditoria', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Auditoria de Decisões', codigo: 'AUDITORIA-ELG', ordemExibicao: 3, descricao: 'Trilha de todas as decisões de elegibilidade tomadas.', objetivo: 'Garantir rastreabilidade das decisões.', responsavelPrincipal: 'Patrícia Lopes' },

    { id: 'seed-mod-lim-calculo', produtoId: 'seed-produto-limites-credito', nome: 'Cálculo de Limite', codigo: 'CALCULO-LIMITE', ordemExibicao: 1, descricao: 'Calcula o limite inicial de crédito do cedente.', objetivo: 'Padronizar o cálculo de limite.', responsavelPrincipal: 'Thiago Mendes' },
    { id: 'seed-mod-lim-revisao', produtoId: 'seed-produto-limites-credito', nome: 'Revisão de Limite', codigo: 'REVISAO-LIMITE', ordemExibicao: 2, descricao: 'Revisa periodicamente os limites concedidos.', objetivo: 'Manter os limites alinhados ao risco atual.', responsavelPrincipal: 'Gustavo Rocha' },
    { id: 'seed-mod-lim-historico', produtoId: 'seed-produto-limites-credito', nome: 'Histórico de Limites', codigo: 'HISTORICO-LIMITE', ordemExibicao: 3, descricao: 'Guarda o histórico de alterações de limite por cedente.', objetivo: 'Permitir auditoria das mudanças de limite.', responsavelPrincipal: 'Gustavo Rocha' },

    { id: 'seed-mod-copcom-sugestao', produtoId: 'seed-produto-copiloto-comercial', nome: 'Sugestão de Argumentos de Venda', codigo: 'SUGESTAO', ordemExibicao: 1, descricao: 'Sugere argumentos em tempo real durante a ligação.', objetivo: 'Ajudar o vendedor a responder objeções.', responsavelPrincipal: 'Lucas Tavares' },
    { id: 'seed-mod-copcom-objecoes', produtoId: 'seed-produto-copiloto-comercial', nome: 'Análise de Objeções', codigo: 'OBJECOES', ordemExibicao: 2, descricao: 'Classifica e registra as objeções levantadas pelo cliente.', objetivo: 'Gerar dados para treinar o time comercial.', responsavelPrincipal: 'Beatriz Nunes' },

    { id: 'seed-mod-sync-epicos', produtoId: 'seed-produto-sincronizador', nome: 'Sincronização de Épicos', codigo: 'SYNC-EPICOS', ordemExibicao: 1, descricao: 'Importa épicos do Jira para o cadastro de Projeto.', objetivo: 'Evitar recadastro manual de épicos.', responsavelPrincipal: 'Larissa Freitas' },
    { id: 'seed-mod-sync-paginas', produtoId: 'seed-produto-sincronizador', nome: 'Sincronização de Páginas', codigo: 'SYNC-PAGINAS', ordemExibicao: 2, descricao: 'Importa páginas do Confluence para o cadastro de Produto.', objetivo: 'Evitar recadastro manual de documentação.', responsavelPrincipal: 'Larissa Freitas' },

    { id: 'seed-mod-port-acompanhamento', produtoId: 'seed-produto-portal-cliente', nome: 'Acompanhamento de Processos', codigo: 'ACOMPANHAMENTO', ordemExibicao: 1, descricao: 'Mostra o status atual do processo do cliente.', objetivo: 'Dar visibilidade self-service ao cliente.', responsavelPrincipal: 'Fernanda Dias' },
    { id: 'seed-mod-port-documentos', produtoId: 'seed-produto-portal-cliente', nome: 'Central de Documentos', codigo: 'CENTRAL-DOC', ordemExibicao: 2, descricao: 'Disponibiliza documentos assinados para download.', objetivo: 'Permitir que o cliente baixe seus documentos sem contato humano.', responsavelPrincipal: 'Fernanda Dias' },
  ];
  await seedRows(prisma.modulo, 'Modulo', MODULOS_SEED, (m) => ({
    id: m.id, produtoId: m.produtoId, nome: m.nome, codigo: m.codigo, status: ModuloStatus.Ativo,
    descricao: m.descricao, objetivo: m.objetivo, responsavelPrincipal: m.responsavelPrincipal, ordemExibicao: m.ordemExibicao,
  }));

  // --- Funcionalidades, vinculadas a um Módulo, para os 9 produtos ---
  const FUNCIONALIDADES_SEED = [
    { id: 'seed-func-cfg-cadastrar-projeto', produtoId: 'seed-produto-configurador', moduloId: 'seed-mod-cfg-setup-proj', nome: 'Cadastrar Projeto', codigo: 'CADASTRAR-PROJETO', descricao: 'Cria um novo Projeto com seus dados básicos.', objetivo: 'Estruturar o topo da hierarquia de conhecimento.', comportamentoEsperado: 'Valida código único e campos obrigatórios; retorna o Projeto criado.', usuarios: 'Product Owners.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-func-cfg-historico-projeto', produtoId: 'seed-produto-configurador', moduloId: 'seed-mod-cfg-setup-proj', nome: 'Editar Histórico de Projeto', codigo: 'HISTORICO-PROJETO', descricao: 'Consulta o histórico de alterações de um Projeto.', objetivo: 'Dar rastreabilidade às mudanças.', comportamentoEsperado: 'Lista eventos em ordem cronológica decrescente.', usuarios: 'Product Owners e Tech Leads.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-func-cfg-cadastrar-time', produtoId: 'seed-produto-configurador', moduloId: 'seed-mod-cfg-setup-time', nome: 'Cadastrar Time', codigo: 'CADASTRAR-TIME', descricao: 'Cria um Time dentro de um Projeto.', objetivo: 'Estruturar quem trabalha em cada Projeto.', comportamentoEsperado: 'Time fica escopado ao Projeto informado.', usuarios: 'Product Owners.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-func-cfg-vincular-pessoa', produtoId: 'seed-produto-configurador', moduloId: 'seed-mod-cfg-setup-time', nome: 'Vincular Pessoa a Time', codigo: 'VINCULAR-PESSOA', descricao: 'Associa uma Pessoa a um Time existente.', objetivo: 'Deixar claro quem faz parte de cada Time.', comportamentoEsperado: 'Rejeita vínculo com Time de outro Projeto.', usuarios: 'Product Owners.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-func-cfg-cadastrar-produto', produtoId: 'seed-produto-configurador', moduloId: 'seed-mod-cfg-setup-prod', nome: 'Cadastrar Produto', codigo: 'CADASTRAR-PRODUTO', descricao: 'Cria um Produto dentro de um Projeto.', objetivo: 'Estruturar o conhecimento de cada Produto.', comportamentoEsperado: 'Valida código único dentro do Projeto.', usuarios: 'Product Owners.', responsavelPrincipal: 'Ronaldo Palhoni' },
    { id: 'seed-func-cfg-calcular-maturidade', produtoId: 'seed-produto-configurador', moduloId: 'seed-mod-cfg-maturidade', nome: 'Calcular Indicadores de Maturidade', codigo: 'CALCULAR-MATURIDADE', descricao: 'Agrega indicadores de completude do cadastro de um Produto.', objetivo: 'Saber quando um Produto está pronto para os agents.', comportamentoEsperado: 'Recalcula sempre que uma sub-entidade do Produto muda.', usuarios: 'Tech Leads e Agents de IA.', responsavelPrincipal: 'Felipe Andrade' },

    { id: 'seed-func-cop-indexar', produtoId: 'seed-produto-copiloto', moduloId: 'seed-mod-cop-ingestao', nome: 'Indexar Documentação Estruturada', codigo: 'INDEXAR-DOC', descricao: 'Indexa o conteúdo estruturado do Configurador para busca.', objetivo: 'Manter a base de conhecimento do copiloto atualizada.', comportamentoEsperado: 'Reindexação incremental quando um Produto é editado.', usuarios: 'Sistema (processo automático).', responsavelPrincipal: 'Felipe Andrade' },
    { id: 'seed-func-cop-responder', produtoId: 'seed-produto-copiloto', moduloId: 'seed-mod-cop-motor-qa', nome: 'Responder Pergunta em Linguagem Natural', codigo: 'RESPONDER-PERGUNTA', descricao: 'Recebe uma pergunta e retorna a resposta com a fonte citada.', objetivo: 'Diminuir o tempo de resposta a dúvidas recorrentes.', comportamentoEsperado: 'Sempre cita a fonte; se não souber, indica baixa confiança.', usuarios: 'Times de suporte interno.', responsavelPrincipal: 'Felipe Andrade' },
    { id: 'seed-func-cop-registrar-feedback', produtoId: 'seed-produto-copiloto', moduloId: 'seed-mod-cop-feedback', nome: 'Registrar Feedback de Resposta', codigo: 'REGISTRAR-FEEDBACK', descricao: 'Permite marcar uma resposta como útil ou não.', objetivo: 'Melhorar a precisão do copiloto ao longo do tempo.', comportamentoEsperado: 'Feedback fica associado à pergunta e resposta originais.', usuarios: 'Atendentes de primeira linha.', responsavelPrincipal: 'Felipe Andrade' },
    { id: 'seed-func-cop-escalar', produtoId: 'seed-produto-copiloto', moduloId: 'seed-mod-cop-motor-qa', nome: 'Escalar para Atendente Humano', codigo: 'ESCALAR-HUMANO', descricao: 'Encaminha a conversa para um atendente quando a confiança é baixa.', objetivo: 'Evitar resposta errada em caso de baixa confiança.', comportamentoEsperado: 'Dispara abaixo do limiar mínimo de confiança configurado.', usuarios: 'Atendentes de primeira linha.', responsavelPrincipal: 'Felipe Andrade' },

    { id: 'seed-func-cad-upload', produtoId: 'seed-produto-cadastro-digital', moduloId: 'seed-mod-cad-documentos', nome: 'Upload de Documento', codigo: 'UPLOAD-DOC', descricao: 'Recebe o arquivo de documento do cedente.', objetivo: 'Coletar os documentos necessários para análise.', comportamentoEsperado: 'Aceita PDF/JPG/PNG até 10MB; rejeita outros formatos com mensagem clara.', usuarios: 'Cedentes PF e PJ.', responsavelPrincipal: 'Diego Martins' },
    { id: 'seed-func-cad-ocr', produtoId: 'seed-produto-cadastro-digital', moduloId: 'seed-mod-cad-documentos', nome: 'OCR de Documento', codigo: 'OCR-DOC', descricao: 'Extrai texto e dados estruturados do documento enviado.', objetivo: 'Preencher automaticamente os dados do cadastro.', comportamentoEsperado: 'Se o documento estiver ilegível, sinaliza para reenvio.', usuarios: 'Sistema (processo automático).', responsavelPrincipal: 'Diego Martins' },
    { id: 'seed-func-cad-facial', produtoId: 'seed-produto-cadastro-digital', moduloId: 'seed-mod-cad-identidade', nome: 'Verificação Facial', codigo: 'VERIFICACAO-FACIAL', descricao: 'Compara selfie do cedente com a foto do documento.', objetivo: 'Reduzir fraude de identidade.', comportamentoEsperado: 'Abaixo do score mínimo de similaridade, encaminha para análise manual.', usuarios: 'Cedentes PF.', responsavelPrincipal: 'Diego Martins' },
    { id: 'seed-func-cad-serasa', produtoId: 'seed-produto-cadastro-digital', moduloId: 'seed-mod-cad-bureaus', nome: 'Consulta Serasa', codigo: 'CONSULTA-SERASA', descricao: 'Consulta dados cadastrais e restritivos no Serasa.', objetivo: 'Enriquecer o cadastro com dados externos.', comportamentoEsperado: 'Timeout de 5s; se falhar, tenta novamente uma vez.', usuarios: 'Sistema (processo automático).', responsavelPrincipal: 'Rafael Nogueira' },
    { id: 'seed-func-cad-receita', produtoId: 'seed-produto-cadastro-digital', moduloId: 'seed-mod-cad-bureaus', nome: 'Consulta Receita Federal', codigo: 'CONSULTA-RFB', descricao: 'Valida CPF/CNPJ na base da Receita Federal.', objetivo: 'Confirmar que o documento é válido e regular.', comportamentoEsperado: 'CPF/CNPJ irregular bloqueia o avanço do cadastro.', usuarios: 'Sistema (processo automático).', responsavelPrincipal: 'Rafael Nogueira' },
    { id: 'seed-func-cad-fila-aprovacao', produtoId: 'seed-produto-cadastro-digital', moduloId: 'seed-mod-cad-aprovacao', nome: 'Fila de Aprovação Manual', codigo: 'FILA-APROVACAO', descricao: 'Lista cadastros pendentes de revisão manual.', objetivo: 'Tratar exceções que a automação não resolve.', comportamentoEsperado: 'Ordenada por tempo de espera, mais antigo primeiro.', usuarios: 'Analistas de Backoffice.', responsavelPrincipal: 'Rafael Nogueira' },

    { id: 'seed-func-scr-calcular', produtoId: 'seed-produto-score-credito', moduloId: 'seed-mod-scr-motor', nome: 'Calcular Score', codigo: 'CALCULAR-SCORE', descricao: 'Calcula o score de crédito a partir dos dados do cedente.', objetivo: 'Gerar uma nota de risco padronizada.', comportamentoEsperado: 'Retorna score de 0 a 1000 e o motivo dos principais componentes.', usuarios: 'Cadastro Digital CPF/CNPJ (sistema).', responsavelPrincipal: 'Juliana Ramos' },
    { id: 'seed-func-scr-consultar-historico', produtoId: 'seed-produto-score-credito', moduloId: 'seed-mod-scr-historico', nome: 'Consultar Histórico de Score', codigo: 'CONSULTAR-HISTORICO-SCORE', descricao: 'Lista os scores calculados para um cedente ao longo do tempo.', objetivo: 'Permitir comparação e auditoria.', comportamentoEsperado: 'Retorna ordenado do mais recente para o mais antigo.', usuarios: 'Comitê de Crédito.', responsavelPrincipal: 'Juliana Ramos' },
    { id: 'seed-func-scr-ajustar-parametros', produtoId: 'seed-produto-score-credito', moduloId: 'seed-mod-scr-parametros', nome: 'Ajustar Parâmetros do Modelo', codigo: 'AJUSTAR-PARAMETROS', descricao: 'Altera os pesos usados no cálculo do score.', objetivo: 'Permitir ajuste do modelo sem alterar código.', comportamentoEsperado: 'Alteração exige aprovação de dois membros do comitê.', usuarios: 'Comitê de Crédito.', responsavelPrincipal: 'Juliana Ramos' },
    { id: 'seed-func-scr-exportar', produtoId: 'seed-produto-score-credito', moduloId: 'seed-mod-scr-historico', nome: 'Exportar Relatório de Score', codigo: 'EXPORTAR-RELATORIO', descricao: 'Gera um relatório de distribuição de scores por período.', objetivo: 'Apoiar a revisão periódica do modelo.', comportamentoEsperado: 'Exporta em CSV com filtro por data.', usuarios: 'Comitê de Crédito.', responsavelPrincipal: 'Juliana Ramos' },

    { id: 'seed-func-elg-avaliar', produtoId: 'seed-produto-motor-elegibilidade', moduloId: 'seed-mod-elg-regras', nome: 'Avaliar Elegibilidade do Cedente', codigo: 'AVALIAR-ELEGIBILIDADE', descricao: 'Aplica as regras de elegibilidade vigentes a um cedente.', objetivo: 'Decidir se o cedente pode operar com o fundo.', comportamentoEsperado: 'Retorna elegível/inelegível e o motivo da decisão.', usuarios: 'Mesa de Operações de Crédito.', responsavelPrincipal: 'Ana Beatriz Ferreira' },
    { id: 'seed-func-elg-excecao', produtoId: 'seed-produto-motor-elegibilidade', moduloId: 'seed-mod-elg-excecoes', nome: 'Registrar Exceção Aprovada', codigo: 'REGISTRAR-EXCECAO', descricao: 'Registra uma exceção de elegibilidade aprovada pelo comitê.', objetivo: 'Permitir flexibilidade controlada às regras padrão.', comportamentoEsperado: 'Exige referência à ata de aprovação do comitê.', usuarios: 'Mesa de Operações de Crédito.', responsavelPrincipal: 'Ana Beatriz Ferreira' },
    { id: 'seed-func-elg-trilha', produtoId: 'seed-produto-motor-elegibilidade', moduloId: 'seed-mod-elg-auditoria', nome: 'Consultar Trilha de Auditoria', codigo: 'TRILHA-AUDITORIA', descricao: 'Lista todas as decisões de elegibilidade tomadas.', objetivo: 'Garantir rastreabilidade das decisões.', comportamentoEsperado: 'Filtra por cedente, fundo e período.', usuarios: 'Auditoria e Compliance.', responsavelPrincipal: 'Patrícia Lopes' },
    { id: 'seed-func-elg-simular', produtoId: 'seed-produto-motor-elegibilidade', moduloId: 'seed-mod-elg-regras', nome: 'Simular Elegibilidade', codigo: 'SIMULAR-ELEGIBILIDADE', descricao: 'Simula o resultado da avaliação sem gravar a decisão.', objetivo: 'Apoiar negociação comercial antes do cadastro formal.', comportamentoEsperado: 'Não gera registro de auditoria, apenas resultado temporário.', usuarios: 'Mesa de Operações de Crédito.', responsavelPrincipal: 'Ana Beatriz Ferreira' },

    { id: 'seed-func-lim-calcular-inicial', produtoId: 'seed-produto-limites-credito', moduloId: 'seed-mod-lim-calculo', nome: 'Calcular Limite Inicial', codigo: 'CALCULAR-LIMITE-INICIAL', descricao: 'Calcula o limite inicial de crédito no onboarding.', objetivo: 'Padronizar o cálculo de limite.', comportamentoEsperado: 'Usa score de crédito e elegibilidade como entrada.', usuarios: 'Mesa de Operações de Crédito.', responsavelPrincipal: 'Thiago Mendes' },
    { id: 'seed-func-lim-revisar', produtoId: 'seed-produto-limites-credito', moduloId: 'seed-mod-lim-revisao', nome: 'Revisar Limite Periodicamente', codigo: 'REVISAR-LIMITE', descricao: 'Recalcula o limite com base em dados atualizados.', objetivo: 'Manter os limites alinhados ao risco atual.', comportamentoEsperado: 'Executa automaticamente a cada revisão trimestral.', usuarios: 'Mesa de Operações de Crédito.', responsavelPrincipal: 'Gustavo Rocha' },
    { id: 'seed-func-lim-consultar-historico', produtoId: 'seed-produto-limites-credito', moduloId: 'seed-mod-lim-historico', nome: 'Consultar Histórico de Limite', codigo: 'CONSULTAR-HISTORICO-LIMITE', descricao: 'Lista as alterações de limite de um cedente.', objetivo: 'Permitir auditoria das mudanças de limite.', comportamentoEsperado: 'Mostra valor anterior, novo valor e motivo da mudança.', usuarios: 'Auditoria Interna.', responsavelPrincipal: 'Gustavo Rocha' },
    { id: 'seed-func-lim-bloquear', produtoId: 'seed-produto-limites-credito', moduloId: 'seed-mod-lim-revisao', nome: 'Bloquear Limite Manualmente', codigo: 'BLOQUEAR-LIMITE', descricao: 'Zera o limite de um cedente manualmente.', objetivo: 'Permitir ação imediata em caso de risco identificado.', comportamentoEsperado: 'Exige justificativa obrigatória e registra quem bloqueou.', usuarios: 'Mesa de Operações de Crédito.', responsavelPrincipal: 'Thiago Mendes' },

    { id: 'seed-func-copcom-sugerir', produtoId: 'seed-produto-copiloto-comercial', moduloId: 'seed-mod-copcom-sugestao', nome: 'Sugerir Argumento em Tempo Real', codigo: 'SUGERIR-ARGUMENTO', descricao: 'Sugere um argumento de venda com base no que o cliente disse.', objetivo: 'Ajudar o vendedor a responder objeções.', comportamentoEsperado: 'Sugestão aparece em até 2 segundos após a fala do cliente.', usuarios: 'Vendedores Externos.', responsavelPrincipal: 'Lucas Tavares' },
    { id: 'seed-func-copcom-classificar', produtoId: 'seed-produto-copiloto-comercial', moduloId: 'seed-mod-copcom-objecoes', nome: 'Classificar Objeção do Cliente', codigo: 'CLASSIFICAR-OBJECAO', descricao: 'Identifica o tipo de objeção levantada pelo cliente.', objetivo: 'Gerar dados para treinar o time comercial.', comportamentoEsperado: 'Classifica em categorias pré-definidas (preço, prazo, confiança etc.).', usuarios: 'Sistema (processo automático).', responsavelPrincipal: 'Beatriz Nunes' },
    { id: 'seed-func-copcom-registrar-resultado', produtoId: 'seed-produto-copiloto-comercial', moduloId: 'seed-mod-copcom-objecoes', nome: 'Registrar Resultado da Ligação', codigo: 'REGISTRAR-RESULTADO', descricao: 'Registra se a ligação terminou em venda ou não.', objetivo: 'Medir a efetividade das sugestões do copiloto.', comportamentoEsperado: 'Campo obrigatório ao final de cada ligação.', usuarios: 'Vendedores Externos.', responsavelPrincipal: 'Beatriz Nunes' },

    { id: 'seed-func-sync-importar-epico', produtoId: 'seed-produto-sincronizador', moduloId: 'seed-mod-sync-epicos', nome: 'Importar Épico do Jira', codigo: 'IMPORTAR-EPICO', descricao: 'Importa um épico do Jira como um Projeto ou histórico.', objetivo: 'Evitar retrabalho de documentação já existente.', comportamentoEsperado: 'Sincronização é somente leitura, nunca escreve no Jira.', usuarios: 'Product Owners.', responsavelPrincipal: 'Larissa Freitas' },
    { id: 'seed-func-sync-importar-pagina', produtoId: 'seed-produto-sincronizador', moduloId: 'seed-mod-sync-paginas', nome: 'Importar Página do Confluence', codigo: 'IMPORTAR-PAGINA', descricao: 'Importa uma página do Confluence como referência de um Produto.', objetivo: 'Evitar retrabalho de documentação já existente.', comportamentoEsperado: 'Sincronização é somente leitura.', usuarios: 'Tech Writers.', responsavelPrincipal: 'Larissa Freitas' },
    { id: 'seed-func-sync-resolver-conflito', produtoId: 'seed-produto-sincronizador', moduloId: 'seed-mod-sync-epicos', nome: 'Resolver Conflito de Sincronização', codigo: 'RESOLVER-CONFLITO', descricao: 'Trata o caso de o dado ter sido editado nos dois lados.', objetivo: 'Evitar perda de informação em conflitos.', comportamentoEsperado: 'Conflito bloqueia a atualização automática e notifica o PO.', usuarios: 'Product Owners.', responsavelPrincipal: 'Eduardo Vieira' },

    { id: 'seed-func-port-consultar-status', produtoId: 'seed-produto-portal-cliente', moduloId: 'seed-mod-port-acompanhamento', nome: 'Consultar Status do Processo', codigo: 'CONSULTAR-STATUS', descricao: 'Mostra a etapa atual do processo do cliente.', objetivo: 'Dar visibilidade self-service ao cliente.', comportamentoEsperado: 'Cliente só vê os próprios processos.', usuarios: 'Clientes PF e PJ.', responsavelPrincipal: 'Fernanda Dias' },
    { id: 'seed-func-port-baixar-documento', produtoId: 'seed-produto-portal-cliente', moduloId: 'seed-mod-port-documentos', nome: 'Baixar Documento Assinado', codigo: 'BAIXAR-DOCUMENTO', descricao: 'Permite baixar um documento assinado do processo.', objetivo: 'Permitir acesso self-service ao documento.', comportamentoEsperado: 'Documento fica disponível por 12 meses após a assinatura.', usuarios: 'Clientes PF e PJ.', responsavelPrincipal: 'Fernanda Dias' },
    { id: 'seed-func-port-notificacao', produtoId: 'seed-produto-portal-cliente', moduloId: 'seed-mod-port-acompanhamento', nome: 'Receber Notificação de Atualização', codigo: 'NOTIFICACAO-ATUALIZACAO', descricao: 'Notifica o cliente quando o processo muda de etapa.', objetivo: 'Reduzir ligações perguntando sobre andamento.', comportamentoEsperado: 'Notificação por e-mail em até 5 minutos após a mudança.', usuarios: 'Clientes PF e PJ.', responsavelPrincipal: 'Bruno Lima' },
  ];
  await seedRows(prisma.funcionalidade, 'Funcionalidade', FUNCIONALIDADES_SEED, (f) => ({
    id: f.id, produtoId: f.produtoId, moduloId: f.moduloId, nome: f.nome, codigo: f.codigo, status: FuncionalidadeStatus.Ativo,
    descricao: f.descricao, objetivo: f.objetivo, comportamentoEsperado: f.comportamentoEsperado, usuarios: f.usuarios, responsavelPrincipal: f.responsavelPrincipal,
  }));

  // --- Jornadas, para os 9 produtos (algumas com produtos participantes cross-projeto) ---
  const JORNADAS_SEED = [
    {
      id: 'seed-jorn-cfg-estruturar', produtoId: 'seed-produto-configurador', publicoAlvoId: 'seed-pa-cfg-pos', nome: 'Estruturar um Novo Projeto do Zero',
      descricao: 'Jornada do PO desde a criação do Projeto até o primeiro Produto cadastrado.', objetivo: 'Reduzir o tempo de setup inicial de um novo Projeto.',
      eventoInicial: 'PO decide estruturar um novo Projeto no Configurador.', resultadoEsperado: 'Projeto, Times, Pessoas e ao menos um Produto cadastrados.',
      etapas: ['Criar o Projeto', 'Cadastrar Times', 'Cadastrar Pessoas', 'Cadastrar Produtos'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cfg-setup-proj', 'seed-mod-cfg-setup-time', 'seed-mod-cfg-setup-prod'],
      funcionalidadeIds: ['seed-func-cfg-cadastrar-projeto', 'seed-func-cfg-cadastrar-time', 'seed-func-cfg-cadastrar-produto'],
    },
    {
      id: 'seed-jorn-cfg-preparar-agents', produtoId: 'seed-produto-configurador', publicoAlvoId: 'seed-pa-cfg-agents', nome: 'Preparar Produto para Consumo por Agents',
      descricao: 'Jornada de maturação de um Produto até ficar pronto para os agents de IA consultarem.', objetivo: 'Garantir que o Produto tenha completude mínima antes de habilitar agents.',
      eventoInicial: 'Produto atinge as sub-entidades mínimas cadastradas.', resultadoEsperado: 'Indicador de maturidade acima do limiar definido.',
      etapas: ['Cadastrar sub-entidades do Produto', 'Calcular indicadores de maturidade', 'Habilitar consumo por agents'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cfg-maturidade'], funcionalidadeIds: ['seed-func-cfg-calcular-maturidade'],
    },
    {
      id: 'seed-jorn-cfg-auditoria', produtoId: 'seed-produto-configurador', publicoAlvoId: 'seed-pa-cfg-techleads', nome: 'Auditoria de Maturidade Trimestral',
      descricao: 'Revisão periódica dos indicadores de maturidade de todos os Produtos.', objetivo: 'Identificar Produtos com lacunas de documentação.',
      eventoInicial: 'Início do trimestre.', resultadoEsperado: 'Lista de pendências por Produto, com responsável definido.',
      etapas: ['Calcular maturidade de todos os Produtos', 'Identificar lacunas', 'Atribuir pendências aos responsáveis'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cfg-maturidade'],
    },
    {
      id: 'seed-jorn-cop-duvida', produtoId: 'seed-produto-copiloto', publicoAlvoId: 'seed-pa-cop-atendentes', nome: 'Atendente Tira Dúvida Recorrente',
      descricao: 'Atendente pergunta ao copiloto sobre uma dúvida já documentada.', objetivo: 'Resolver a dúvida sem precisar escalar.',
      eventoInicial: 'Atendente recebe uma pergunta do usuário final.', resultadoEsperado: 'Resposta correta entregue com a fonte citada.',
      etapas: ['Atendente pergunta ao copiloto', 'Copiloto busca na base indexada', 'Copiloto responde citando a fonte'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cop-motor-qa'], funcionalidadeIds: ['seed-func-cop-responder'],
    },
    {
      id: 'seed-jorn-cop-escalonamento', produtoId: 'seed-produto-copiloto', publicoAlvoId: 'seed-pa-cop-suporte', nome: 'Escalonamento por Baixa Confiança',
      descricao: 'Copiloto não tem confiança suficiente e escala para um especialista.', objetivo: 'Evitar resposta errada em caso de dúvida não documentada.',
      eventoInicial: 'Confiança da resposta fica abaixo do limiar mínimo.', resultadoEsperado: 'Pergunta escalada e respondida por um humano.',
      etapas: ['Copiloto calcula confiança da resposta', 'Confiança abaixo do limiar', 'Escala para atendente humano', 'Atendente registra feedback'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cop-motor-qa', 'seed-mod-cop-feedback'], funcionalidadeIds: ['seed-func-cop-escalar', 'seed-func-cop-registrar-feedback'],
    },
    {
      id: 'seed-jorn-cad-pf', produtoId: 'seed-produto-cadastro-digital', publicoAlvoId: 'seed-pa-cad-pf', nome: 'Cadastro de Cedente PF',
      descricao: 'Jornada completa de cadastro de um cedente pessoa física.', objetivo: 'Aprovar o cadastro no mesmo dia sempre que possível.',
      eventoInicial: 'Cedente PF inicia o cadastro no app.', resultadoEsperado: 'Cadastro aprovado ou encaminhado para análise manual.',
      etapas: ['Upload de documentos', 'OCR e verificação facial', 'Consulta a bureaus', 'Cálculo de score', 'Decisão automática ou fila manual'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cad-documentos', 'seed-mod-cad-identidade', 'seed-mod-cad-bureaus'],
      funcionalidadeIds: ['seed-func-cad-upload', 'seed-func-cad-ocr', 'seed-func-cad-facial', 'seed-func-cad-serasa'],
      produtoParticipanteIds: ['seed-produto-score-credito'],
    },
    {
      id: 'seed-jorn-cad-pj', produtoId: 'seed-produto-cadastro-digital', publicoAlvoId: 'seed-pa-cad-pj', nome: 'Cadastro de Cedente PJ',
      descricao: 'Jornada de cadastro de uma empresa, incluindo sócios e procuradores.', objetivo: 'Coletar documentação societária sem confundir o fluxo de PF.',
      eventoInicial: 'Cedente PJ inicia o cadastro pelo portal.', resultadoEsperado: 'Cadastro completo com todos os sócios validados.',
      etapas: ['Upload de contrato social', 'Cadastro de sócios e procuradores', 'Consulta a bureaus', 'Fila de aprovação manual'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cad-documentos', 'seed-mod-cad-bureaus', 'seed-mod-cad-aprovacao'],
      funcionalidadeIds: ['seed-func-cad-upload', 'seed-func-cad-receita', 'seed-func-cad-fila-aprovacao'],
      produtoParticipanteIds: ['seed-produto-score-credito'],
    },
    {
      id: 'seed-jorn-cad-reanalise', produtoId: 'seed-produto-cadastro-digital', publicoAlvoId: 'seed-pa-cad-backoffice', nome: 'Reanálise por Pendência Documental',
      descricao: 'Cadastro fica pendente por documento ilegível e volta para reanálise.', objetivo: 'Resolver a pendência sem perder o andamento já feito.',
      eventoInicial: 'OCR não consegue ler o documento enviado.', resultadoEsperado: 'Documento reenviado e cadastro retomado.',
      etapas: ['Sistema sinaliza documento ilegível', 'Cedente reenvia documento', 'Analista revisa manualmente'], paises: ['Brasil'],
      moduloIds: ['seed-mod-cad-documentos', 'seed-mod-cad-aprovacao'], funcionalidadeIds: ['seed-func-cad-ocr', 'seed-func-cad-fila-aprovacao'],
    },
    {
      id: 'seed-jorn-scr-calculo', produtoId: 'seed-produto-score-credito', publicoAlvoId: 'seed-pa-scr-sistemas', nome: 'Cálculo de Score no Cadastro',
      descricao: 'Score é calculado automaticamente durante o cadastro do cedente.', objetivo: 'Entregar o score a tempo de não travar o fluxo de cadastro.',
      eventoInicial: 'Cadastro Digital solicita o score de um cedente.', resultadoEsperado: 'Score retornado em menos de 2 segundos.',
      etapas: ['Receber dados do cedente', 'Calcular score', 'Registrar no histórico', 'Retornar resultado'], paises: ['Brasil'],
      moduloIds: ['seed-mod-scr-motor', 'seed-mod-scr-historico'], funcionalidadeIds: ['seed-func-scr-calcular'],
      produtoParticipanteIds: ['seed-produto-cadastro-digital'],
    },
    {
      id: 'seed-jorn-scr-revisao', produtoId: 'seed-produto-score-credito', publicoAlvoId: 'seed-pa-scr-comite', nome: 'Revisão Trimestral de Modelo',
      descricao: 'Comitê revisa a distribuição de scores e ajusta parâmetros do modelo.', objetivo: 'Manter o modelo de score alinhado à realidade da carteira.',
      eventoInicial: 'Início do trimestre.', resultadoEsperado: 'Parâmetros do modelo revisados e aprovados pelo comitê.',
      etapas: ['Exportar relatório de score do trimestre', 'Comitê analisa a distribuição', 'Ajustar parâmetros se necessário'], paises: ['Brasil'],
      moduloIds: ['seed-mod-scr-parametros', 'seed-mod-scr-historico'], funcionalidadeIds: ['seed-func-scr-exportar', 'seed-func-scr-ajustar-parametros'],
    },
    {
      id: 'seed-jorn-elg-avaliacao', produtoId: 'seed-produto-motor-elegibilidade', publicoAlvoId: 'seed-pa-elg-mesa', nome: 'Avaliação de Elegibilidade no Onboarding',
      descricao: 'Elegibilidade do cedente é avaliada como parte do fluxo de onboarding, usando dados do Cadastro Digital e do Score de Crédito.',
      objetivo: 'Garantir que só cedentes elegíveis avancem no onboarding.', eventoInicial: 'Cadastro Digital conclui a coleta de dados do cedente.',
      resultadoEsperado: 'Cedente marcado como elegível ou inelegível, com motivo registrado.',
      etapas: ['Receber dados do Cadastro Digital', 'Receber score do Score de Crédito', 'Avaliar regras de elegibilidade', 'Registrar decisão'], paises: ['Brasil'],
      moduloIds: ['seed-mod-elg-regras', 'seed-mod-elg-auditoria'], funcionalidadeIds: ['seed-func-elg-avaliar', 'seed-func-elg-trilha'],
      produtoParticipanteIds: ['seed-produto-cadastro-digital', 'seed-produto-score-credito'],
    },
    {
      id: 'seed-jorn-elg-revisao-excecao', produtoId: 'seed-produto-motor-elegibilidade', publicoAlvoId: 'seed-pa-elg-fundos', nome: 'Revisão de Exceção pelo Comitê',
      descricao: 'Um fundo solicita exceção a uma regra de elegibilidade padrão.', objetivo: 'Permitir flexibilidade controlada sem abrir mão de rastreabilidade.',
      eventoInicial: 'Fundo solicita exceção para um cedente inelegível.', resultadoEsperado: 'Exceção aprovada ou negada, com ata registrada.',
      etapas: ['Fundo solicita a exceção', 'Comitê avalia o pedido', 'Exceção registrada no sistema'], paises: ['Brasil'],
      moduloIds: ['seed-mod-elg-excecoes'], funcionalidadeIds: ['seed-func-elg-excecao'],
    },
    {
      id: 'seed-jorn-lim-definicao', produtoId: 'seed-produto-limites-credito', publicoAlvoId: 'seed-pa-lim-mesa', nome: 'Definição de Limite no Onboarding',
      descricao: 'Limite inicial é calculado depois que o cedente é considerado elegível.', objetivo: 'Conceder um limite inicial coerente com o risco do cedente.',
      eventoInicial: 'Motor de Elegibilidade aprova o cedente.', resultadoEsperado: 'Limite inicial calculado e disponível para operação.',
      etapas: ['Receber decisão de elegibilidade', 'Calcular limite inicial', 'Publicar limite'], paises: ['Brasil'],
      moduloIds: ['seed-mod-lim-calculo'], funcionalidadeIds: ['seed-func-lim-calcular-inicial'],
      produtoParticipanteIds: ['seed-produto-motor-elegibilidade'],
    },
    {
      id: 'seed-jorn-lim-revisao', produtoId: 'seed-produto-limites-credito', publicoAlvoId: 'seed-pa-lim-auditoria', nome: 'Revisão Trimestral de Limite',
      descricao: 'Limites concedidos são revisados periodicamente com base em dados atualizados.', objetivo: 'Manter os limites alinhados ao risco atual de cada cedente.',
      eventoInicial: 'Início do trimestre.', resultadoEsperado: 'Limites revisados e histórico de mudanças registrado.',
      etapas: ['Selecionar cedentes para revisão', 'Recalcular limite', 'Registrar histórico da alteração'], paises: ['Brasil'],
      moduloIds: ['seed-mod-lim-revisao', 'seed-mod-lim-historico'], funcionalidadeIds: ['seed-func-lim-revisar', 'seed-func-lim-consultar-historico'],
    },
    {
      id: 'seed-jorn-copcom-atendimento', produtoId: 'seed-produto-copiloto-comercial', publicoAlvoId: 'seed-pa-copcom-vendedores', nome: 'Atendimento Comercial Assistido',
      descricao: 'Vendedor recebe sugestões em tempo real durante uma ligação comercial.', objetivo: 'Aumentar a taxa de conversão da ligação.',
      eventoInicial: 'Vendedor inicia uma ligação com um lead.', resultadoEsperado: 'Ligação concluída com resultado registrado.',
      etapas: ['Cliente levanta uma objeção', 'Copiloto classifica a objeção', 'Copiloto sugere argumento', 'Vendedor registra o resultado'], paises: ['Brasil'],
      moduloIds: ['seed-mod-copcom-sugestao', 'seed-mod-copcom-objecoes'], funcionalidadeIds: ['seed-func-copcom-sugerir', 'seed-func-copcom-classificar'],
    },
    {
      id: 'seed-jorn-sync-diaria', produtoId: 'seed-produto-sincronizador', publicoAlvoId: 'seed-pa-sync-pos', nome: 'Sincronização Diária Automática',
      descricao: 'Épicos do Jira e páginas do Confluence são sincronizados automaticamente todos os dias.', objetivo: 'Evitar retrabalho de documentação já existente.',
      eventoInicial: 'Job diário de sincronização é disparado.', resultadoEsperado: 'Épicos e páginas atualizados, conflitos sinalizados.',
      etapas: ['Buscar épicos atualizados no Jira', 'Buscar páginas atualizadas no Confluence', 'Aplicar atualização ou sinalizar conflito'], paises: ['Brasil'],
      moduloIds: ['seed-mod-sync-epicos', 'seed-mod-sync-paginas'], funcionalidadeIds: ['seed-func-sync-importar-epico', 'seed-func-sync-importar-pagina'],
    },
    {
      id: 'seed-jorn-port-acompanhar', produtoId: 'seed-produto-portal-cliente', publicoAlvoId: 'seed-pa-port-pj', nome: 'Acompanhar Processo em Andamento',
      descricao: 'Cliente consulta o status do seu processo no portal.', objetivo: 'Resolver a dúvida do cliente sem precisar de atendimento humano.',
      eventoInicial: 'Cliente acessa o portal para consultar o processo.', resultadoEsperado: 'Cliente vê o status atual e recebe notificações de mudança.',
      etapas: ['Cliente consulta o status', 'Sistema mostra a etapa atual', 'Cliente recebe notificação quando o status muda'], paises: ['Brasil'],
      moduloIds: ['seed-mod-port-acompanhamento'], funcionalidadeIds: ['seed-func-port-consultar-status', 'seed-func-port-notificacao'],
    },
  ];
  await seedRows(prisma.jornada, 'Jornada', JORNADAS_SEED, (j) => ({
    id: j.id, produtoId: j.produtoId, publicoAlvoId: j.publicoAlvoId, nome: j.nome, status: JornadaStatus.Ativo,
    descricao: j.descricao, objetivo: j.objetivo, eventoInicial: j.eventoInicial, resultadoEsperado: j.resultadoEsperado,
    etapas: j.etapas, paises: j.paises,
    modulos: j.moduloIds ? { connect: j.moduloIds.map((id) => ({ id })) } : undefined,
    funcionalidades: j.funcionalidadeIds ? { connect: j.funcionalidadeIds.map((id) => ({ id })) } : undefined,
    produtosParticipantes: j.produtoParticipanteIds ? { connect: j.produtoParticipanteIds.map((id) => ({ id })) } : undefined,
  }));

  // --- Regras, para os 9 produtos (4 delas com 2 versões, para demonstrar o versionamento) ---
  const REGRAS_SEED = [
    { id: 'seed-regra-cfg-codigo-unico', produtoId: 'seed-produto-configurador', nome: 'Código de Projeto Deve Ser Único', condicao: 'Um novo Projeto é criado com um código já usado por outro Projeto.', resultadoEsperado: 'Criação é bloqueada com mensagem de código duplicado.', excecoes: [], exemplos: ['Tentar criar "NEX-CFG" quando já existe um Projeto com esse código.'], prioridade: 'Alta', moduloIds: ['seed-mod-cfg-setup-proj'], funcionalidadeIds: ['seed-func-cfg-cadastrar-projeto'] },
    { id: 'seed-regra-cfg-time-mesmo-projeto', produtoId: 'seed-produto-configurador', nome: 'Produto Não Pode Ter Time Responsável de Outro Projeto', condicao: 'Time responsável selecionado no cadastro de Produto pertence a um Projeto diferente.', resultadoEsperado: 'Cadastro é bloqueado com erro de validação.', excecoes: [], exemplos: ['Selecionar um Time do Projeto "Onboarding Digital" para um Produto do Projeto "Nexus".'], prioridade: 'Média', moduloIds: ['seed-mod-cfg-setup-prod'], funcionalidadeIds: ['seed-func-cfg-cadastrar-produto'] },
    {
      id: 'seed-regra-cfg-maturidade-minima', produtoId: 'seed-produto-configurador', nome: 'Maturidade Mínima para Habilitar Agents',
      condicao: 'Indicador de maturidade do Produto está abaixo do limiar mínimo.', resultadoEsperado: 'Produto não pode ser habilitado para consumo por agents.',
      excecoes: ['Produtos em fase de piloto interno, mediante aprovação do PO.'], exemplos: ['Produto com 45% de maturidade não pode habilitar agents.'],
      prioridade: 'Alta', moduloIds: ['seed-mod-cfg-maturidade'], funcionalidadeIds: ['seed-func-cfg-calcular-maturidade'],
      observacoes: 'v1: limiar de 60%.',
      versao2: { condicao: 'Indicador de maturidade do Produto está abaixo de 75%.', observacoes: 'v2: limiar elevado de 60% para 75% após revisão do comitê de agents.' },
    },
    { id: 'seed-regra-cfg-historico-append', produtoId: 'seed-produto-configurador', nome: 'Histórico É Sempre Append-Only', condicao: 'Qualquer tentativa de editar ou remover uma entrada de histórico existente.', resultadoEsperado: 'Operação é rejeitada; histórico só recebe novas entradas.', excecoes: [], exemplos: ['Tentar corrigir o texto de uma entrada de histórico já registrada.'], prioridade: 'Média' },

    { id: 'seed-regra-cop-confianca-minima', produtoId: 'seed-produto-copiloto', nome: 'Confiança Mínima para Responder Automaticamente', condicao: 'Confiança calculada para a resposta está abaixo de 70%.', resultadoEsperado: 'Pergunta é escalada para um atendente humano.', excecoes: [], exemplos: ['Pergunta ambígua sem correspondência clara na base retorna confiança de 40%.'], prioridade: 'Alta', moduloIds: ['seed-mod-cop-motor-qa'], funcionalidadeIds: ['seed-func-cop-escalar'] },
    { id: 'seed-regra-cop-citar-fonte', produtoId: 'seed-produto-copiloto', nome: 'Sempre Citar Fonte da Resposta', condicao: 'Copiloto responde qualquer pergunta com base na documentação indexada.', resultadoEsperado: 'Resposta inclui referência ao Produto/documento de origem.', excecoes: [], exemplos: ['Resposta sobre regra de crédito cita a Regra e o Produto de origem.'], prioridade: 'Alta', moduloIds: ['seed-mod-cop-motor-qa'], funcionalidadeIds: ['seed-func-cop-responder'] },
    { id: 'seed-regra-cop-dados-sensiveis', produtoId: 'seed-produto-copiloto', nome: 'Não Responder Sobre Dados Sensíveis', condicao: 'Pergunta solicita dado pessoal específico de um cliente (CPF, score individual etc.).', resultadoEsperado: 'Copiloto recusa e orienta o canal correto para a consulta.', excecoes: [], exemplos: ['"Qual o CPF do cliente X?" é recusado pelo copiloto.'], prioridade: 'Alta' },

    { id: 'seed-regra-cad-doc-ilegivel', produtoId: 'seed-produto-cadastro-digital', nome: 'Documento Ilegível Bloqueia Avanço', condicao: 'OCR não consegue extrair os campos obrigatórios do documento.', resultadoEsperado: 'Cadastro fica pendente até o reenvio do documento.', excecoes: [], exemplos: ['Foto de documento borrada ou com reflexo de luz.'], prioridade: 'Alta', moduloIds: ['seed-mod-cad-documentos'], funcionalidadeIds: ['seed-func-cad-ocr'] },
    { id: 'seed-regra-cad-duplicado', produtoId: 'seed-produto-cadastro-digital', nome: 'CPF/CNPJ Já Cadastrado Não Duplica', condicao: 'CPF/CNPJ informado já possui um cadastro ativo no mesmo Projeto.', resultadoEsperado: 'Sistema reaproveita o cadastro existente em vez de criar um novo.', excecoes: [], exemplos: ['Cedente tenta se cadastrar de novo com o mesmo CPF.'], prioridade: 'Alta', moduloIds: ['seed-mod-cad-documentos'] },
    {
      id: 'seed-regra-cad-limite-tentativas', produtoId: 'seed-produto-cadastro-digital', nome: 'Limite de Tentativas de Upload',
      condicao: 'Cedente tenta enviar o mesmo documento mais de 3 vezes sem sucesso.', resultadoEsperado: 'Cadastro é encaminhado para análise manual.',
      excecoes: [], exemplos: ['Cedente falha 4 vezes seguidas no upload do RG.'], prioridade: 'Média', moduloIds: ['seed-mod-cad-documentos', 'seed-mod-cad-aprovacao'], funcionalidadeIds: ['seed-func-cad-upload', 'seed-func-cad-fila-aprovacao'],
      observacoes: 'v1: limite de 3 tentativas.',
      versao2: { condicao: 'Cedente tenta enviar o mesmo documento mais de 5 vezes sem sucesso.', observacoes: 'v2: limite ampliado de 3 para 5 tentativas após feedback de clientes com conexão instável.' },
    },
    { id: 'seed-regra-cad-aprovacao-score', produtoId: 'seed-produto-cadastro-digital', nome: 'Aprovação Automática Exige Score Válido', condicao: 'Aprovação automática é avaliada sem um score de crédito calculado e válido.', resultadoEsperado: 'Cadastro aguarda o cálculo do score antes de decidir.', excecoes: [], exemplos: ['Serviço de Score de Crédito fora do ar durante o cadastro.'], prioridade: 'Alta', moduloIds: ['seed-mod-cad-aprovacao'], funcionalidadeIds: ['seed-func-cad-fila-aprovacao'] },

    {
      id: 'seed-regra-scr-score-minimo', produtoId: 'seed-produto-score-credito', nome: 'Score Mínimo para Aprovação Automática',
      condicao: 'Score calculado é menor que 600.', resultadoEsperado: 'Cadastro não é aprovado automaticamente; segue para análise manual.',
      excecoes: ['Cedente com garantia real aprovada pelo comitê.'], exemplos: ['Cedente com score 580 vai para fila manual.'], prioridade: 'Alta', moduloIds: ['seed-mod-scr-motor'], funcionalidadeIds: ['seed-func-scr-calcular'],
      observacoes: 'v1: score mínimo de 600.',
      versao2: { condicao: 'Score calculado é menor que 650.', observacoes: 'v2: score mínimo elevado de 600 para 650 após revisão trimestral do modelo.' },
    },
    { id: 'seed-regra-scr-restritivo', produtoId: 'seed-produto-score-credito', nome: 'Penalização por Restritivo Grave', condicao: 'Cedente possui restritivo grave nos bureaus consultados.', resultadoEsperado: 'Score sofre penalização fixa de 200 pontos.', excecoes: [], exemplos: ['Cedente com protesto grave nos últimos 12 meses.'], prioridade: 'Alta', moduloIds: ['seed-mod-scr-motor'] },
    { id: 'seed-regra-scr-peso-renda', produtoId: 'seed-produto-score-credito', nome: 'Peso de Renda Declarada no Score', condicao: 'Cálculo do score considera a renda declarada pelo cedente.', resultadoEsperado: 'Renda declarada representa até 20% do score final.', excecoes: [], exemplos: ['Cedente com renda alta e demais fatores neutros recebe bônus no score.'], prioridade: 'Média', moduloIds: ['seed-mod-scr-parametros'] },
    { id: 'seed-regra-scr-validade', produtoId: 'seed-produto-score-credito', nome: 'Validade do Score É de 90 Dias', condicao: 'Score calculado há mais de 90 dias é usado em uma nova decisão.', resultadoEsperado: 'Score é recalculado antes da decisão.', excecoes: [], exemplos: ['Cedente aprovado há 4 meses solicita novo limite.'], prioridade: 'Média', moduloIds: ['seed-mod-scr-historico'], funcionalidadeIds: ['seed-func-scr-consultar-historico'] },

    {
      id: 'seed-regra-elg-setorial', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Elegibilidade Setorial Restrita',
      condicao: 'Cedente pertence a um dos 3 setores restritos definidos pela política de risco.', resultadoEsperado: 'Cedente é marcado como inelegível, salvo exceção aprovada.',
      excecoes: ['Exceção aprovada pelo comitê para o fundo específico.'], exemplos: ['Cedente do setor de apostas online é inelegível por padrão.'], prioridade: 'Alta', moduloIds: ['seed-mod-elg-regras'], funcionalidadeIds: ['seed-func-elg-avaliar'],
      observacoes: 'v1: lista com 3 setores restritos.',
      versao2: { condicao: 'Cedente pertence a um dos 5 setores restritos definidos pela política de risco.', observacoes: 'v2: lista ampliada de 3 para 5 setores restritos após revisão jurídica.' },
    },
    { id: 'seed-regra-elg-restritivo-grave', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Bloqueio por Restritivo Grave', condicao: 'Cedente possui restritivo grave e irrecuperável nos bureaus.', resultadoEsperado: 'Cedente é bloqueado, sem possibilidade de exceção.', excecoes: [], exemplos: ['Cedente com falência decretada.'], prioridade: 'Alta', moduloIds: ['seed-mod-elg-regras'] },
    { id: 'seed-regra-elg-excecao-comite', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Exceção Exige Aprovação do Comitê', condicao: 'Fundo solicita exceção a uma regra de elegibilidade padrão.', resultadoEsperado: 'Exceção só é aplicada com ata de aprovação do comitê registrada.', excecoes: [], exemplos: ['Solicitação de exceção sem ata é rejeitada automaticamente.'], prioridade: 'Alta', moduloIds: ['seed-mod-elg-excecoes'], funcionalidadeIds: ['seed-func-elg-excecao'] },
    { id: 'seed-regra-elg-reavaliacao', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Reavaliação Anual Obrigatória', condicao: 'Cedente elegível completa 12 meses desde a última avaliação.', resultadoEsperado: 'Elegibilidade é reavaliada automaticamente.', excecoes: [], exemplos: ['Cedente aprovado há exatamente 1 ano é reavaliado.'], prioridade: 'Média', moduloIds: ['seed-mod-elg-regras'], jornadaIds: ['seed-jorn-elg-avaliacao'] },

    { id: 'seed-regra-lim-patrimonio', produtoId: 'seed-produto-limites-credito', nome: 'Limite Não Pode Exceder Patrimônio Declarado', condicao: 'Limite calculado é maior que o patrimônio declarado pelo cedente.', resultadoEsperado: 'Limite é ajustado para não exceder o patrimônio declarado.', excecoes: [], exemplos: ['Cálculo bruto de limite resulta em valor maior que o patrimônio informado.'], prioridade: 'Alta', moduloIds: ['seed-mod-lim-calculo'], funcionalidadeIds: ['seed-func-lim-calcular-inicial'] },
    { id: 'seed-regra-lim-reducao-atraso', produtoId: 'seed-produto-limites-credito', nome: 'Redução Automática por Atraso', condicao: 'Cedente possui atraso superior a 30 dias em alguma operação.', resultadoEsperado: 'Limite é reduzido automaticamente em 50%.', excecoes: [], exemplos: ['Cedente com parcela em atraso há 35 dias tem o limite reduzido.'], prioridade: 'Alta', moduloIds: ['seed-mod-lim-revisao'], funcionalidadeIds: ['seed-func-lim-revisar'] },
    { id: 'seed-regra-lim-zerado-bloqueia', produtoId: 'seed-produto-limites-credito', nome: 'Limite Zerado Bloqueia Novas Operações', condicao: 'Limite disponível do cedente é igual a zero.', resultadoEsperado: 'Novas operações são bloqueadas até revisão do limite.', excecoes: [], exemplos: ['Cedente com limite zerado tenta uma nova antecipação.'], prioridade: 'Alta', moduloIds: ['seed-mod-lim-revisao'], funcionalidadeIds: ['seed-func-lim-bloquear'] },

    { id: 'seed-regra-copcom-nao-prometer', produtoId: 'seed-produto-copiloto-comercial', nome: 'Sugestão Não Pode Prometer Desconto Não Aprovado', condicao: 'Sugestão gerada menciona um percentual de desconto específico.', resultadoEsperado: 'Sugestão é bloqueada e substituída por texto genérico.', excecoes: [], exemplos: ['Copiloto tenta sugerir "ofereça 20% de desconto" sem essa política existir.'], prioridade: 'Alta', moduloIds: ['seed-mod-copcom-sugestao'], funcionalidadeIds: ['seed-func-copcom-sugerir'] },
    { id: 'seed-regra-copcom-registrar-objecao', produtoId: 'seed-produto-copiloto-comercial', nome: 'Registrar Toda Objeção para Treinamento do Modelo', condicao: 'Cliente levanta qualquer objeção durante a ligação.', resultadoEsperado: 'Objeção é classificada e registrada, mesmo que a ligação termine em venda.', excecoes: [], exemplos: ['Cliente questiona o prazo de entrega mas fecha a venda mesmo assim.'], prioridade: 'Média', moduloIds: ['seed-mod-copcom-objecoes'], funcionalidadeIds: ['seed-func-copcom-classificar'] },

    { id: 'seed-regra-sync-somente-leitura', produtoId: 'seed-produto-sincronizador', nome: 'Sincronização É Somente Leitura', condicao: 'Qualquer tentativa de escrever de volta no Jira ou Confluence.', resultadoEsperado: 'Operação é bloqueada; sincronização é sempre de fora para dentro.', excecoes: [], exemplos: ['Editar um épico no Nexus não altera o Jira.'], prioridade: 'Alta', moduloIds: ['seed-mod-sync-epicos', 'seed-mod-sync-paginas'] },
    { id: 'seed-regra-sync-conflito-bloqueia', produtoId: 'seed-produto-sincronizador', nome: 'Conflito Bloqueia Atualização Automática', condicao: 'Dado foi editado tanto no Nexus quanto no Jira/Confluence desde a última sincronização.', resultadoEsperado: 'Atualização automática é pausada e o PO é notificado para resolver manualmente.', excecoes: [], exemplos: ['PO edita a descrição do épico no Nexus no mesmo dia que ele muda no Jira.'], prioridade: 'Média', moduloIds: ['seed-mod-sync-epicos'], funcionalidadeIds: ['seed-func-sync-resolver-conflito'] },

    { id: 'seed-regra-port-proprios-processos', produtoId: 'seed-produto-portal-cliente', nome: 'Cliente Só Vê Seus Próprios Processos', condicao: 'Cliente tenta acessar um processo que não é seu.', resultadoEsperado: 'Acesso é negado com erro 403.', excecoes: [], exemplos: ['Cliente tenta acessar a URL de um processo de outro CPF.'], prioridade: 'Alta', moduloIds: ['seed-mod-port-acompanhamento'], funcionalidadeIds: ['seed-func-port-consultar-status'] },
    { id: 'seed-regra-port-documento-12-meses', produtoId: 'seed-produto-portal-cliente', nome: 'Documento Fica Disponível por 12 Meses', condicao: 'Documento assinado passa de 12 meses desde a assinatura.', resultadoEsperado: 'Documento é removido do portal e o cliente precisa solicitar via suporte.', excecoes: [], exemplos: ['Documento assinado há 13 meses não aparece mais para download.'], prioridade: 'Média', moduloIds: ['seed-mod-port-documentos'], funcionalidadeIds: ['seed-func-port-baixar-documento'] },
  ];

  for (const r of REGRAS_SEED) {
    const baseData = {
      produtoId: r.produtoId, nome: r.nome, status: RegraStatus.Ativo, condicao: r.condicao, resultadoEsperado: r.resultadoEsperado,
      excecoes: r.excecoes ?? [], exemplos: r.exemplos ?? [], prioridade: r.prioridade, observacoes: (r as { observacoes?: string }).observacoes,
      modulos: r.moduloIds ? { connect: r.moduloIds.map((id: string) => ({ id })) } : undefined,
      funcionalidades: r.funcionalidadeIds ? { connect: r.funcionalidadeIds.map((id: string) => ({ id })) } : undefined,
      jornadas: r.jornadaIds ? { connect: r.jornadaIds.map((id: string) => ({ id })) } : undefined,
    };
    const versao2 = (r as { versao2?: { condicao?: string; observacoes?: string } }).versao2;
    const v1 = await prisma.regra.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, grupoId: r.id, numeroVersao: 1, versaoAtual: !versao2, ...baseData },
    });
    await seedHistory('Regra', v1.id, admin.id);
    if (versao2) {
      const v2 = await prisma.regra.upsert({
        where: { id: `${r.id}-v2` },
        update: {},
        create: { id: `${r.id}-v2`, grupoId: r.id, numeroVersao: 2, versaoAtual: true, ...baseData, condicao: versao2.condicao ?? r.condicao, observacoes: versao2.observacoes },
      });
      await seedHistory('Regra', v2.id, admin.id, `Nova versão criada (v2, a partir da v1)`);
    }
  }
  console.log(`${REGRAS_SEED.length} regras de exemplo prontas (${REGRAS_SEED.filter((r) => (r as { versao2?: unknown }).versao2).length} com 2 versões).`);

  // --- Integrações, para os 9 produtos (algumas cross-produto/cross-projeto) ---
  const INTEGRACOES_SEED = [
    { id: 'seed-int-cfg-sync-jira', produtoId: 'seed-produto-configurador', nome: 'Sincroniza Épicos do Jira', direcao: 'Entrada', papelDependencia: 'Sincronização', tipo: 'API', endpoint: 'GET /rest/api/3/search (Jira Cloud)', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Épicos, status, responsáveis', timeProprietarioId: 'seed-time-config-core', funcionalidadeIds: ['seed-func-cfg-cadastrar-projeto', 'seed-func-cfg-historico-projeto'] },
    { id: 'seed-int-cfg-publica-maturidade', produtoId: 'seed-produto-configurador', nome: 'Publica Eventos de Maturidade para o Copiloto', direcao: 'Saída', papelDependencia: 'Publicação-Assinatura', produtoRelacionadoId: 'seed-produto-copiloto', tipo: 'Evento', endpoint: 'produto.maturidade.atualizada', modo: 'Assíncrona', criticidade: 'Alta', dadosTrafegados: 'Indicador de maturidade, produto', timeProprietarioId: 'seed-time-agents', funcionalidadeIds: ['seed-func-cfg-calcular-maturidade'] },
    { id: 'seed-int-cfg-exporta-base', produtoId: 'seed-produto-configurador', nome: 'Exporta Base Estruturada para Agents', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'GET /api/produtos/:produtoId/export', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'Estrutura completa do produto', timeProprietarioId: 'seed-time-agents', funcionalidadeIds: ['seed-func-cfg-calcular-maturidade'] },

    { id: 'seed-int-cop-consome-base', produtoId: 'seed-produto-copiloto', nome: 'Consome Base do Configurador do Nexo', direcao: 'Entrada', papelDependencia: 'Consulta', produtoRelacionadoId: 'seed-produto-configurador', tipo: 'API', endpoint: 'GET /api/produtos/:produtoId/export', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'Módulos, funcionalidades, regras', timeProprietarioId: 'seed-time-agents', funcionalidadeIds: ['seed-func-cop-indexar'] },
    { id: 'seed-int-cop-notifica-suporte', produtoId: 'seed-produto-copiloto', nome: 'Notifica Squad de Suporte', direcao: 'Saída', papelDependencia: 'Notificação', tipo: 'Evento', endpoint: 'copiloto.escalado', modo: 'Assíncrona', criticidade: 'Média', dadosTrafegados: 'Pergunta, motivo do escalonamento', timeProprietarioId: 'seed-time-agents', funcionalidadeIds: ['seed-func-cop-escalar'] },
    { id: 'seed-int-cop-consulta-llm', produtoId: 'seed-produto-copiloto', nome: 'Consulta Modelo de Linguagem (LLM)', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'POST /v1/chat/completions (LLM externo)', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'Pergunta, contexto, resposta gerada', timeProprietarioId: 'seed-time-agents', funcionalidadeIds: ['seed-func-cop-responder'] },

    { id: 'seed-int-cad-serasa', produtoId: 'seed-produto-cadastro-digital', nome: 'Consulta Serasa', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'POST /v1/consulta-cadastral (Serasa)', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'CPF/CNPJ, restritivos, score externo', timeProprietarioId: 'seed-time-squad-onboarding', funcionalidadeIds: ['seed-func-cad-serasa'] },
    { id: 'seed-int-cad-receita', produtoId: 'seed-produto-cadastro-digital', nome: 'Consulta Receita Federal', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'POST /v1/cpf-cnpj (Receita Federal)', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'CPF/CNPJ, situação cadastral', timeProprietarioId: 'seed-time-squad-onboarding', funcionalidadeIds: ['seed-func-cad-receita'] },
    { id: 'seed-int-cad-envia-score', produtoId: 'seed-produto-cadastro-digital', nome: 'Envia Dados para Score de Crédito', direcao: 'Saída', papelDependencia: 'Delegação', produtoRelacionadoId: 'seed-produto-score-credito', tipo: 'Evento', endpoint: 'cadastro.dados-coletados', modo: 'Assíncrona', criticidade: 'Alta', dadosTrafegados: 'Dados cadastrais do cedente', timeProprietarioId: 'seed-time-squad-onboarding', funcionalidadeIds: ['seed-func-cad-fila-aprovacao'] },
    { id: 'seed-int-cad-storage-doc', produtoId: 'seed-produto-cadastro-digital', nome: 'Armazena Documento em Storage Externo', direcao: 'Saída', papelDependencia: 'Sincronização', tipo: 'Arquivo', endpoint: 'PUT /v1/documentos (storage externo)', modo: 'Assíncrona', criticidade: 'Média', dadosTrafegados: 'Arquivo do documento, metadados', timeProprietarioId: 'seed-time-squad-onboarding', funcionalidadeIds: ['seed-func-cad-upload'] },
    { id: 'seed-int-cad-ocr-externo', produtoId: 'seed-produto-cadastro-digital', nome: 'Consulta Serviço de OCR', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'POST /v1/ocr (serviço de OCR externo)', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'Imagem do documento, campos extraídos', timeProprietarioId: 'seed-time-squad-onboarding', funcionalidadeIds: ['seed-func-cad-ocr'] },
    { id: 'seed-int-cad-biometria', produtoId: 'seed-produto-cadastro-digital', nome: 'Consulta Serviço de Biometria Facial', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'POST /v1/biometria/verificar (serviço de biometria externo)', modo: 'Síncrona', criticidade: 'Alta', dadosTrafegados: 'Selfie, foto do documento, score de similaridade', timeProprietarioId: 'seed-time-squad-onboarding', funcionalidadeIds: ['seed-func-cad-facial'] },

    { id: 'seed-int-scr-recebe-cadastro', produtoId: 'seed-produto-score-credito', nome: 'Recebe Dados do Cadastro Digital', direcao: 'Entrada', papelDependencia: 'Publicação-Assinatura', produtoRelacionadoId: 'seed-produto-cadastro-digital', tipo: 'Evento', endpoint: 'cadastro.dados-coletados', modo: 'Assíncrona', criticidade: 'Alta', dadosTrafegados: 'Dados cadastrais, renda declarada', timeProprietarioId: 'seed-time-risco-compliance-onb', funcionalidadeIds: ['seed-func-scr-calcular'] },
    { id: 'seed-int-scr-envia-elegibilidade', produtoId: 'seed-produto-score-credito', nome: 'Envia Score para Motor de Elegibilidade', direcao: 'Saída', papelDependencia: 'Publicação-Assinatura', produtoRelacionadoId: 'seed-produto-motor-elegibilidade', tipo: 'Evento', endpoint: 'score.calculado', modo: 'Assíncrona', criticidade: 'Alta', dadosTrafegados: 'Score, cedente, data de cálculo', timeProprietarioId: 'seed-time-risco-compliance-onb', funcionalidadeIds: ['seed-func-scr-calcular'] },

    { id: 'seed-int-elg-recebe-score', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Recebe Score do Motor de Score de Crédito', direcao: 'Entrada', papelDependencia: 'Publicação-Assinatura', produtoRelacionadoId: 'seed-produto-score-credito', tipo: 'Evento', endpoint: 'score.calculado', modo: 'Assíncrona', criticidade: 'Alta', dadosTrafegados: 'Score, cedente', timeProprietarioId: 'seed-time-regras-compliance', funcionalidadeIds: ['seed-func-elg-avaliar'] },
    { id: 'seed-int-elg-notifica-limites', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Notifica Limites de Crédito', direcao: 'Saída', papelDependencia: 'Publicação-Assinatura', produtoRelacionadoId: 'seed-produto-limites-credito', tipo: 'Evento', endpoint: 'elegibilidade.decidida', modo: 'Assíncrona', criticidade: 'Média', dadosTrafegados: 'Decisão de elegibilidade, cedente', timeProprietarioId: 'seed-time-regras-compliance', funcionalidadeIds: ['seed-func-elg-avaliar'] },
    { id: 'seed-int-elg-consulta-cvm', produtoId: 'seed-produto-motor-elegibilidade', nome: 'Consulta CVM', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'GET /dados-abertos/fundos (CVM)', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'CNPJ do fundo, situação regulatória', timeProprietarioId: 'seed-time-regras-compliance', funcionalidadeIds: ['seed-func-elg-avaliar'] },

    { id: 'seed-int-lim-recebe-elegibilidade', produtoId: 'seed-produto-limites-credito', nome: 'Recebe Elegibilidade do Motor de Elegibilidade', direcao: 'Entrada', papelDependencia: 'Publicação-Assinatura', produtoRelacionadoId: 'seed-produto-motor-elegibilidade', tipo: 'Evento', endpoint: 'elegibilidade.decidida', modo: 'Assíncrona', criticidade: 'Alta', dadosTrafegados: 'Decisão de elegibilidade, cedente', timeProprietarioId: 'seed-time-engenharia-regras', funcionalidadeIds: ['seed-func-lim-calcular-inicial'] },
    { id: 'seed-int-lim-publica-atualizado', produtoId: 'seed-produto-limites-credito', nome: 'Publica Limite Atualizado', direcao: 'Saída', papelDependencia: 'Publicação-Assinatura', tipo: 'Evento', endpoint: 'limite.atualizado', modo: 'Assíncrona', criticidade: 'Média', dadosTrafegados: 'Novo limite, cedente, motivo da alteração', timeProprietarioId: 'seed-time-engenharia-regras', funcionalidadeIds: ['seed-func-lim-revisar'] },

    { id: 'seed-int-copcom-consome-base', produtoId: 'seed-produto-copiloto-comercial', nome: 'Consome Base do Configurador', direcao: 'Entrada', papelDependencia: 'Consulta', produtoRelacionadoId: 'seed-produto-configurador', tipo: 'API', endpoint: 'GET /api/produtos/:produtoId/export', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Argumentos de venda, políticas comerciais', timeProprietarioId: 'seed-time-squad-copiloto-comercial', funcionalidadeIds: ['seed-func-copcom-sugerir'] },
    { id: 'seed-int-copcom-notifica-crm', produtoId: 'seed-produto-copiloto-comercial', nome: 'Notifica CRM Externo', direcao: 'Saída', papelDependencia: 'Notificação', tipo: 'API', endpoint: 'POST /v1/activities (CRM externo)', modo: 'Assíncrona', criticidade: 'Baixa', dadosTrafegados: 'Resultado da ligação, objeções', timeProprietarioId: 'seed-time-squad-copiloto-comercial', funcionalidadeIds: ['seed-func-copcom-registrar-resultado'] },
    { id: 'seed-int-copcom-nlp', produtoId: 'seed-produto-copiloto-comercial', nome: 'Consulta Serviço de Classificação de Texto (NLP)', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'POST /v1/classificar (serviço de NLP externo)', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Transcrição da objeção, categoria', timeProprietarioId: 'seed-time-squad-copiloto-comercial', funcionalidadeIds: ['seed-func-copcom-classificar'] },

    { id: 'seed-int-sync-le-jira', produtoId: 'seed-produto-sincronizador', nome: 'Lê Épicos do Jira', direcao: 'Entrada', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'GET /rest/api/3/search (Jira Cloud)', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Épicos, status, responsáveis', timeProprietarioId: 'seed-time-squad-integracoes-nexus', funcionalidadeIds: ['seed-func-sync-importar-epico'] },
    { id: 'seed-int-sync-le-confluence', produtoId: 'seed-produto-sincronizador', nome: 'Lê Páginas do Confluence', direcao: 'Entrada', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'GET /wiki/rest/api/content (Confluence Cloud)', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Páginas, conteúdo, autor', timeProprietarioId: 'seed-time-squad-integracoes-nexus', funcionalidadeIds: ['seed-func-sync-importar-pagina'] },

    { id: 'seed-int-port-consulta-status', produtoId: 'seed-produto-portal-cliente', nome: 'Consulta Status no Sistema Interno', direcao: 'Entrada', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'GET /interno/processos/:id/status', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Status do processo, etapa atual', timeProprietarioId: 'seed-time-squad-portal-cliente', funcionalidadeIds: ['seed-func-port-consultar-status'] },
    { id: 'seed-int-port-storage-assinatura', produtoId: 'seed-produto-portal-cliente', nome: 'Busca Documento no Storage de Assinaturas', direcao: 'Saída', papelDependencia: 'Consulta', tipo: 'API', endpoint: 'GET /v1/documentos/:id (storage de assinaturas externo)', modo: 'Síncrona', criticidade: 'Média', dadosTrafegados: 'Documento assinado, data de assinatura', timeProprietarioId: 'seed-time-squad-portal-cliente', funcionalidadeIds: ['seed-func-port-baixar-documento'] },
    { id: 'seed-int-port-notificacao-email', produtoId: 'seed-produto-portal-cliente', nome: 'Envia E-mail de Notificação', direcao: 'Saída', papelDependencia: 'Notificação', tipo: 'API', endpoint: 'POST /v3/mail/send (serviço de e-mail externo)', modo: 'Assíncrona', criticidade: 'Baixa', dadosTrafegados: 'E-mail do cliente, mensagem', timeProprietarioId: 'seed-time-squad-portal-cliente', funcionalidadeIds: ['seed-func-port-notificacao'] },
  ];
  await seedRows(prisma.integracao, 'Integracao', INTEGRACOES_SEED, (i) => ({
    id: i.id, produtoId: i.produtoId, nome: i.nome, status: IntegracaoStatus.Ativo, direcao: i.direcao,
    papelDependencia: (i as { papelDependencia?: string }).papelDependencia,
    produtoRelacionadoId: (i as { produtoRelacionadoId?: string }).produtoRelacionadoId,
    tipo: i.tipo, endpoint: i.endpoint, modo: i.modo, criticidade: i.criticidade, dadosTrafegados: i.dadosTrafegados, timeProprietarioId: i.timeProprietarioId,
    funcionalidades: (i as { funcionalidadeIds?: string[] }).funcionalidadeIds
      ? { connect: (i as { funcionalidadeIds?: string[] }).funcionalidadeIds!.map((id) => ({ id })) }
      : undefined,
  }));

  // Registro de teste criado durante a validação do papel/funcionalidades da Integração nesta sessão.
  await prisma.integracao.deleteMany({ where: { id: { in: ['cmsj7jhs70000b4vp31f8ap5n'] } } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
