import { useEffect, useRef, useState } from 'react';
import { Controller, type Control, type FieldValues } from 'react-hook-form';
import { Input, Textarea, tokens, useDark } from '@/design-system';
import { normalizeOptions, type ExtraOptions } from './shared';
import type { FieldConfig, SelectOption } from './types';

type AnyFieldConfig = FieldConfig<Record<string, unknown>>;

export function EntitySelectField({
  value,
  onChange,
  options,
  error,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  error?: boolean;
}) {
  const dark = useDark();
  return (
    <div style={{ position: 'relative' }}>
      <select
        className="dbc-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: 36,
          padding: '0 32px 0 12px',
          borderRadius: 6,
          appearance: 'none',
          border: `1px solid ${error ? '#ff4d4f' : dark ? 'var(--color-border)' : '#d9d9d9'}`,
          background: dark ? 'var(--color-bg-subtle)' : '#fff',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          cursor: 'pointer',
          color: dark ? 'var(--color-text)' : 'rgba(5,5,5,.88)',
        }}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: dark ? 'rgba(255,255,255,.3)' : 'rgba(5,5,5,.3)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

export function EntityMultiSelectField({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value ?? [];
  const selectedOptions = options.filter((option) => selected.includes(option.value));

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function toggle(optValue: string) {
    onChange(selected.includes(optValue) ? selected.filter((v) => v !== optValue) : [...selected, optValue]);
  }

  function remove(optValue: string) {
    onChange(selected.filter((v) => v !== optValue));
  }

  return (
    <div className="entity-multiselect" ref={rootRef}>
      <button
        type="button"
        className={`entity-multiselect__control${open ? ' is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="entity-multiselect__values">
          {selectedOptions.length ? selectedOptions.map((option) => (
            <span className="entity-multiselect__chip" key={option.value}>
              {option.label}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remover ${option.label}`}
                onClick={(event) => { event.stopPropagation(); remove(option.value); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    remove(option.value);
                  }
                }}
              >×</span>
            </span>
          )) : <span className="entity-multiselect__placeholder">Selecione...</span>}
        </span>
        <span className="entity-multiselect__chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="entity-multiselect__menu" role="listbox" aria-multiselectable="true">
          {options.length ? options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                type="button"
                key={option.value}
                className={`entity-multiselect__option${checked ? ' is-selected' : ''}`}
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option.value)}
              >
                <span className="entity-multiselect__check">{checked ? '✓' : ''}</span>
                <span>{option.label}</span>
              </button>
            );
          }) : <div className="entity-multiselect__empty">Nenhuma opção disponível.</div>}
        </div>
      )}
    </div>
  );
}

function EntityCheckboxField({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const dark = useDark();
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, cursor: 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 17, height: 17, accentColor: '#3b82c4', cursor: 'pointer' }}
      />
      <span className="dbc-text" style={{ fontSize: 13.5, color: dark ? 'var(--color-text)' : undefined }}>
        {label}
      </span>
    </label>
  );
}

function FieldLabel({ label, error, hint, badge, children }: { label: string; error?: string; hint?: string; badge?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="dbc-text-2" style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        {label}
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: tokens.radius.pill, background: 'rgba(114,46,209,.1)', color: '#531dab' }}>{badge}</span>
        )}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4, display: 'block' }}>{error}</span>}
      {hint && !error && (
        <span className="dbc-text-3" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function EntityFormField({
  field,
  control,
  error,
  extraOptions,
}: {
  field: AnyFieldConfig;
  control: Control<FieldValues>;
  error?: string;
  extraOptions?: ExtraOptions;
}) {
  const options = field.type === 'select' || field.type === 'multiselect'
    ? field.optionsFrom
      ? extraOptions?.[field.optionsFrom] ?? []
      : normalizeOptions(field.options)
    : [];

  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: rhf }) => {
        if (field.type === 'boolean') {
          return <EntityCheckboxField checked={!!rhf.value} onChange={rhf.onChange} label={field.label} />;
        }
        let control_: React.ReactNode;
        if (field.readOnly) {
          control_ = <Input type="text" disabled value={(rhf.value as string) ?? ''} placeholder={field.placeholder} />;
        } else if (field.type === 'textarea') {
          control_ = <Textarea rows={3} value={(rhf.value as string) ?? ''} onChange={(e) => rhf.onChange(e.target.value)} />;
        } else if (field.type === 'select') {
          control_ = <EntitySelectField value={rhf.value as string} onChange={rhf.onChange} options={options} error={!!error} />;
        } else if (field.type === 'multiselect') {
          control_ = <EntityMultiSelectField value={(rhf.value as string[]) ?? []} onChange={rhf.onChange} options={options} />;
        } else if (field.type === 'date') {
          control_ = <Input type="date" state={error ? 'error' : 'default'} value={(rhf.value as string) ?? ''} onChange={(e) => rhf.onChange(e.target.value)} />;
        } else if (field.type === 'number') {
          control_ = (
            <Input
              type="number"
              state={error ? 'error' : 'default'}
              value={rhf.value == null ? '' : String(rhf.value)}
              placeholder={field.placeholder}
              onChange={(e) => rhf.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          );
        } else {
          control_ = (
            <Input type="text" state={error ? 'error' : 'default'} value={(rhf.value as string) ?? ''} placeholder={field.placeholder} onChange={(e) => rhf.onChange(e.target.value)} />
          );
        }
        return (
          <FieldLabel label={field.label + (field.required ? ' *' : '')} error={error} hint={field.hint} badge={field.badge}>
            {control_}
          </FieldLabel>
        );
      }}
    />
  );
}
