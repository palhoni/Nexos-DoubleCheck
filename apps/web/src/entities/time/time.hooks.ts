import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { TIME_CONFIG } from './time.config';
import type { Time } from './time.types';

export const timeHooks = createEntityHooks<Time>(TIME_CONFIG);
