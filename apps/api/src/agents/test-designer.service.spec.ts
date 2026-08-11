import {
  parseAndValidateTestPlan,
  TestDesignerService,
  type TestPlan,
} from './test-designer.service';

function validPlan(): TestPlan {
  return {
    resumo: {
      usId: 'US-1',
      titulo: 'Plano',
      escopo: 'Backend',
      status: 'Pronto',
      estrategia: 'Cobertura completa.',
    },
    revisaoIndependente: {
      osOriginalRevisada: true,
      analiseAgent1Revisada: true,
      conclusao: 'Análise suficiente',
      decisaoNovosCasos: 'Gerar novos casos',
      justificativa: 'Foi encontrado um gap real.',
      divergencias: [],
    },
    cobertura: [
      'Happy Path',
      'Casos de borda',
      'Tratamento de erros',
      'Segurança',
      'Performance',
      'Variações de UX',
    ].map((categoria) => ({
      categoria,
      requisitos: 1,
      cobertos: 1,
      percentual: 100,
      avaliacao: 'Coberto',
    })),
    rastreabilidade: [
      {
        requisitoId: 'AC01',
        requisito: 'Persistir',
        cenarioIds: ['CTR-01'],
        cobertura: 'Coberto',
      },
    ],
    gaps: [
      {
        id: 'GAP-01',
        categoria: 'Erro',
        severidade: 'Alta',
        descricao: 'Falha externa',
        requisitoRelacionado: 'AC01',
        assuncao: false,
      },
    ],
    casosRecomendados: [
      {
        id: 'CTR-01',
        gapId: 'GAP-01',
        nome: 'Falha externa',
        categoria: 'Erro',
        escopo: 'Backend',
        precondicoes: [],
        passos: ['Executar'],
        resultadoEsperado: 'Erro tratado',
        automacao: 'Automatizável',
        prioridade: 'Alta',
      },
    ],
    bloqueadores: [],
    checklist: { bloqueadores: [], ordemImplementacao: ['CTR-01'] },
    frontendForaEscopo: [],
    totais: {
      requisitos: 6,
      cobertos: 6,
      gaps: 1,
      casosRecomendados: 1,
      bloqueadores: 0,
      frontend: 0,
    },
  };
}

describe('parseAndValidateTestPlan', () => {
  it('aceita o contrato JSON completo, inclusive dentro de code fence', () => {
    const result = parseAndValidateTestPlan(
      `\`\`\`json\n${JSON.stringify(validPlan())}\n\`\`\``,
      'US-1',
      true,
    );
    expect(result.jsonValid).toBe(true);
    expect(result.contractValid).toBe(true);
    expect(result.plan.casosRecomendados).toHaveLength(1);
  });

  it('rejeita resposta truncada sem descartar o diagnóstico', () => {
    const raw = `${JSON.stringify(validPlan()).slice(0, -80)}`;
    const result = parseAndValidateTestPlan(raw, 'US-1');
    expect(result.jsonValid).toBe(false);
    expect(result.contractValid).toBe(false);
    expect(result.validationErrors[0]).toContain('JSON inválido');
    expect(result.plan.casosRecomendados).toHaveLength(1);
  });

  it('recupera somente os casos completos anteriores ao corte', () => {
    const completeCase = JSON.stringify(validPlan().casosRecomendados[0]);
    const raw = `{"casosRecomendados":[${completeCase},{"id":"CTR-02","nome":"Caso interrompido`;
    const result = parseAndValidateTestPlan(raw, 'US-1');
    expect(result.plan.casosRecomendados.map((item) => item.id)).toEqual([
      'CTR-01',
    ]);
  });

  it('rejeita totais divergentes mesmo quando o JSON é válido', () => {
    const plan = validPlan();
    plan.totais.casosRecomendados = 14;
    const result = parseAndValidateTestPlan(JSON.stringify(plan), 'US-1');
    expect(result.jsonValid).toBe(true);
    expect(result.contractValid).toBe(false);
    expect(result.validationErrors).toContain(
      'Total de casos recomendados divergente: declarado 14, recebido 1.',
    );
  });

  it('exige revisão comprovada das duas fontes nos novos planos', () => {
    const plan = validPlan();
    plan.revisaoIndependente.osOriginalRevisada = false;
    const result = parseAndValidateTestPlan(JSON.stringify(plan), 'US-1', true);
    expect(result.contractValid).toBe(false);
    expect(result.validationErrors).toContain(
      'A revisão independente da OS original e da análise do Agent 1 não foi comprovada.',
    );
  });
});

describe('prompt do Desenhista de Testes', () => {
  it('envia a OS original e a análise estruturada como fontes separadas, sem duplicar o relatório bruto', () => {
    const service = new TestDesignerService({} as never, {} as never);
    const prompt = (
      service as unknown as {
        executionPrompt: (source: unknown, actorEmail: string) => string;
      }
    ).executionPrompt(
      {
        requisito: 'CONTEÚDO ORIGINAL DA OS',
        projeto: { nome: 'Projeto', codigo: 'PRJ' },
        result: {
          analise: { marcador: 'ANÁLISE ESTRUTURADA' },
          resultado: 'RELATÓRIO BRUTO DUPLICADO',
        },
      },
      'qa@example.com',
    );
    expect(prompt).toContain(
      'OS/US ORIGINAL — FONTE PRIMÁRIA:\nCONTEÚDO ORIGINAL DA OS',
    );
    expect(prompt).toContain('ANÁLISE ESTRUTURADA');
    expect(prompt).not.toContain('RELATÓRIO BRUTO DUPLICADO');
    expect(prompt).toContain('Decida explicitamente se há gaps reais.');
  });
});
