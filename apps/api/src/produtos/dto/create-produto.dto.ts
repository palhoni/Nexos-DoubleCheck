import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AREAS_NEGOCIO } from '../../projetos/projeto.constants';
import { AMBIENTES_PRODUTO, ESTABILIDADE_PRODUTO, STATUS_PRODUTO } from '../produto.constants';

export class CreateProdutoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nomeCurto?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo!: string;

  @IsOptional()
  @IsIn(STATUS_PRODUTO)
  status?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  problemaResolve?: string;

  @IsOptional()
  @IsString()
  usuariosPrincipais?: string;

  @IsOptional()
  @IsIn(AREAS_NEGOCIO)
  areaNegocio?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(AREAS_NEGOCIO, { each: true })
  areasBeneficiadas?: string[];

  @IsOptional()
  @IsString()
  timeResponsavelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavelPrincipal?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(AMBIENTES_PRODUTO, { each: true })
  ambientes?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsIn(ESTABILIDADE_PRODUTO)
  estabilidadeStatus?: string;

  @IsOptional()
  @IsString()
  estabilidadeObservacao?: string;

  // paises tem endpoint próprio (lista simples aditiva, como paisesDisponiveis do Projeto).
}
