import { useParams } from 'react-router-dom';
import { Badge, ProgressRow, useDark, type StatusPreset } from '@/design-system';
import { useMaturidadeProduto } from '@/entities/produto/produto.maturidade';

const ESTABILIDADE_PRESET: Record<string, StatusPreset> = {
  'Em Desenvolvimento': 'pendente',
  'Em Evolução': 'analise',
  Estável: 'ativo',
};

function corELabelGeral(geral: number): { cor: string; label: string } {
  if (geral >= 80) return { cor: '#389e0d', label: 'Avançado' };
  if (geral >= 50) return { cor: '#d48806', label: 'Em Progresso' };
  return { cor: '#cf1322', label: 'Inicial' };
}

function AnelMaturidade({ geral }: { geral: number }) {
  const dark = useDark();
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - geral / 100);
  const { cor, label } = corELabelGeral(geral);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={110} height={110} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={raio} fill="none" stroke={dark ? 'var(--color-border)' : '#eef1f5'} strokeWidth={9} />
        <circle
          cx={50}
          cy={50}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth={9}
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x={50} y={47} textAnchor="middle" fontSize={20} fontWeight={700} fill={dark ? 'var(--color-text)' : 'rgba(5,5,5,.88)'}>
          {geral}%
        </text>
        <text x={50} y={64} textAnchor="middle" fontSize={9} fill={dark ? 'var(--color-text-tertiary)' : 'rgba(5,5,5,.45)'}>
          Geral
        </text>
      </svg>
      <span className="dbc-text" style={{ fontSize: 13, fontWeight: 600, color: cor }}>
        {label}
      </span>
    </div>
  );
}

export function MaturidadeTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const { projetoId } = useParams<{ projetoId: string }>();
  const { data, isLoading } = useMaturidadeProduto(projetoId, produtoId);
  const border = '1px solid var(--color-border-secondary)';

  if (isLoading) return <span className="dbc-text-2">Carregando...</span>;
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <AnelMaturidade geral={data.geral} />

        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="dbc-text-3" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Maturidade de Documentação — o quanto este produto está estruturado para um agent raciocinar sobre ele
          </div>
          {data.categorias.map((c) => (
            <ProgressRow key={c.chave} label={c.label} percent={c.percentual} color={corELabelGeral(c.percentual).cor} labelWidth={170} height={7} />
          ))}
        </div>
      </div>

      <div style={{ borderTop: border, paddingTop: 18 }}>
        <div className="dbc-text-3" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
          Estabilidade em Produção
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: data.estabilidadeObservacao ? 6 : 0 }}>
          <Badge kind="status" preset={ESTABILIDADE_PRESET[data.estabilidadeStatus] ?? 'info'}>
            {data.estabilidadeStatus}
          </Badge>
        </div>
        {data.estabilidadeObservacao ? (
          <span className="dbc-text-2" style={{ fontSize: 13 }}>
            {data.estabilidadeObservacao}
          </span>
        ) : (
          <span className="dbc-text-3" style={{ fontSize: 12.5 }}>
            Sem observação registrada. Este indicador é atualizado manualmente pelo PO com base em bugs/erros
            observados em produção — é separado da maturidade de documentação acima.
          </span>
        )}
      </div>
    </div>
  );
}
