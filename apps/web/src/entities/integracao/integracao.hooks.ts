import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { INTEGRACAO_CONFIG } from './integracao.config';
import type { Integracao } from './integracao.types';

export const integracaoHooks = createEntityHooks<Integracao>(INTEGRACAO_CONFIG);
