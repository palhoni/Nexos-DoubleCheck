import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { PROJETO_CONFIG } from './projeto.config';
import type { Projeto } from './projeto.types';

export const projetoHooks = createEntityHooks<Projeto>(PROJETO_CONFIG);
