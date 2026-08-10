import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { PRODUTO_CONFIG } from './produto.config';
import type { Produto } from './produto.types';

export const produtoHooks = createEntityHooks<Produto>(PRODUTO_CONFIG);
