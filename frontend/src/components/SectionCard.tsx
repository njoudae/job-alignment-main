import type { PropsWithChildren, ReactNode } from 'react';

interface Props extends PropsWithChildren {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function SectionCard({ title, subtitle, icon, children }: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl bg-blue-50 p-3 text-brand-600">{icon}</div> : null}
      </div>
      {children}
    </section>
  );
}
