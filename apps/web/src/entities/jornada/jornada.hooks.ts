import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { JORNADA_CONFIG } from './jornada.config';
import type { Jornada } from './jornada.types';

export const jornadaHooks = createEntityHooks<Jornada>(JORNADA_CONFIG);
