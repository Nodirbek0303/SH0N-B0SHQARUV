import { Loader2, Monitor, RefreshCw } from 'lucide-react';
import { ComputerStatus } from '@/components/dashboard/ComputerStatus';
import { DownloadPdfButton } from '@/components/dashboard/DownloadPdfButton';
import { useClubData } from '@/hooks/useClubData';

export function ComputersPage() {
  const { data, error, isLoading, isRefreshing, reload, setComputerStatus, addComputer } = useClubData();

  return <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-6">
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">SHON CLUB | QURILMALAR</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-50"><Monitor className="h-6 w-6 text-brand-400" />Kompyuterlar</h1>
        <p className="mt-1 text-sm text-slate-400">Kompyuter qo‘shish, holatini belgilash va ishlagan vaqtini kuzatish.</p>
      </div>
      {data && <DownloadPdfButton data={data} />}
    </header>
    {isLoading && <div className="flex items-center justify-center gap-3 py-24 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Kompyuterlar yuklanmoqda...</div>}
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-300"><span>{error}</span><button type="button" onClick={reload} disabled={isRefreshing} className="flex items-center gap-2 rounded-lg bg-surface-700 px-3 py-2 font-semibold text-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />Qayta yuklash</button></div>}
    {data && <div className="max-w-5xl"><ComputerStatus computers={data.computers} sessions={data.computerSessions} onStatusChange={setComputerStatus} onAdd={addComputer} /></div>}
  </main>;
}
