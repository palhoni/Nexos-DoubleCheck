import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { FUNCIONALIDADE_CONFIG } from './funcionalidade.config';
import type { Funcionalidade } from './funcionalidade.types';

export const funcionalidadeHooks = createEntityHooks<Funcionalidade>(FUNCIONALIDADE_CONFIG);
