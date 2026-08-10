import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { PUBLICO_ALVO_CONFIG } from './publico-alvo.config';
import type { PublicoAlvo } from './publico-alvo.types';

export const publicoAlvoHooks = createEntityHooks<PublicoAlvo>(PUBLICO_ALVO_CONFIG);
