import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { PESSOA_CONFIG } from './pessoa.config';
import type { Pessoa } from './pessoa.types';

export const pessoaHooks = createEntityHooks<Pessoa>(PESSOA_CONFIG);
