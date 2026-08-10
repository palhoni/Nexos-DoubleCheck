import { useEffect, useMemo } from 'react';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FORM_GRID_EDIT, FormGrid, FormGridItem, Modal, tokens } from '@/design-system';
import { buildZodSchema } from './formSchema';
import { EntityFormField } from './EntityFormFields';
import type { ExtraOptions } from './shared';
import type { EntityConfig } from './types';

export function EntityFormModal<T extends { id: string }>({
  config,
  open,
  item,
  onClose,
  onSave,
  saving = false,
  extraOptions,
}: {
  config: EntityConfig<T>;
  open: boolean;
  item: T | null;
  onClose: () => void;
  onSave: (data: Partial<T>) => void;
  saving?: boolean;
  extraOptions?: ExtraOptions;
}) {
  const isNew = !item;
  const schema = useMemo(() => buildZodSchema(config.form.sections), [config]);
  const readOnlyKeys = useMemo(
    () => new Set(config.form.sections.flatMap((s) => s.fields.filter((f) => f.readOnly).map((f) => f.key))),
    [config],
  );

  const { control, handleSubmit, reset, formState } = useForm<FieldValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: (item ?? {}) as DefaultValues<FieldValues>,
  });

  useEffect(() => {
    if (open) reset((item ?? {}) as DefaultValues<FieldValues>);
  }, [open, item, reset]);

  if (!open) return null;

  const title = isNew ? config.form.title.create : config.form.title.edit;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={660}
      secondaryLabel="Fechar"
      primaryLabel={isNew ? 'Salvar' : 'Salvar alterações'}
      primaryLoading={saving}
      onPrimary={handleSubmit((data) => {
        const cleaned = { ...data };
        for (const key of readOnlyKeys) delete cleaned[key];
        onSave(cleaned as Partial<T>);
      })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {config.form.sections.map((section, si) => (
          <div key={si}>
            <div className="dbc-text-2" style={{ ...tokens.text.label, marginBottom: 12, opacity: 0.7 }}>
              {section.title}
            </div>
            <FormGrid columns={FORM_GRID_EDIT}>
              {section.fields.map((field) => (
                <FormGridItem key={field.key} span={field.colSpan === 2 ? 2 : 1}>
                  <EntityFormField field={field} control={control} error={formState.errors[field.key]?.message as string | undefined} extraOptions={extraOptions} />
                </FormGridItem>
              ))}
            </FormGrid>
          </div>
        ))}
      </div>
    </Modal>
  );
}
