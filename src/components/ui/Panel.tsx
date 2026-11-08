import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, icon, action, className = '', children }: PanelProps) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-surface-600/70 bg-surface-800/80 p-5 shadow-xl shadow-black/20 backdrop-blur-sm ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-400">{icon}</span>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
