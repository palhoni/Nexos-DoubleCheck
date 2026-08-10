import { z } from 'zod';
import type { FieldConfig, FormSection } from './types';

export function buildZodSchema<T extends object>(sections: FormSection<T>[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of sections) {
    for (const field of section.fields as FieldConfig<T>[]) {
      if (field.readOnly) {
        shape[field.key] = z.string().optional();
        continue;
      }

      let schema: z.ZodTypeAny;
      if (field.type === 'multiselect') {
        schema = z.array(z.string());
      } else if (field.type === 'boolean') {
        schema = z.boolean().optional();
      } else if (field.type === 'number') {
        schema = z.number().optional();
      } else {
        schema = z.string();
        if (field.required) {
          schema = (schema as z.ZodString).min(1, `${field.label} é obrigatório`);
        } else {
          schema = schema.optional().or(z.literal(''));
        }
      }
      shape[field.key] = schema;
    }
  }

  return z.object(shape);
}
