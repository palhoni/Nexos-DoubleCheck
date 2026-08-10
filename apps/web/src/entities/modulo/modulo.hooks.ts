import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { MODULO_CONFIG } from './modulo.config';
import type { Modulo } from './modulo.types';

export const moduloHooks = createEntityHooks<Modulo>(MODULO_CONFIG);
