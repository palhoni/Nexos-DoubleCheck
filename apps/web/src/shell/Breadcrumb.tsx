import { Fragment } from 'react';

export interface BreadcrumbProps {
  parts: React.ReactNode[];
}

export function Breadcrumb({ parts }: BreadcrumbProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="dbc-text-2" style={{ fontSize: 12, opacity: 0.5 }}>
              /
            </span>
          )}
          <span className="dbc-text-2" style={{ fontSize: 12 }}>
            {p}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
