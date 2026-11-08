import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Monitor, Plus } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { countComputersByStatus } from '@/lib/dashboardStats';
import { formatCount } from '@/lib/format';
import type { Computer, ComputerSession, ComputerStatus as ComputerState } from '@/types/club';

interface ComputerStatusProps {
  computers: Computer[];
  sessions: ComputerSession[];
  onStatusChange: (id: string, status: ComputerState) => Promise<void>;
  onAdd: (name: string) => Promise<void>;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENTS: { status: ComputerState; label: string; stroke: string; dot: string }[] = [
  { status: 'free', label: "Bo'sh", stroke: '#22C55E', dot: 'bg-success-500' },
  { status: 'busy', label: 'Band', stroke: '#CBD5E1', dot: 'bg-slate-300' },
  { status: 'broken', label: 'Nosoz', stroke: '#EF4444', dot: 'bg-danger-500' },
];

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const remainder = safe % 60;
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  return days ? `${days} kun ${clock}` : clock;
}

export function ComputerStatus({ computers, sessions, onStatusChange, onAdd }: ComputerStatusProps) {
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const counts = countComputersByStatus(computers);
  const total = computers.length;
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  let offset = 0;
  const arcs = SEGMENTS.map((segment) => {
    const length = total === 0 ? 0 : (counts[segment.status] / total) * CIRCUMFERENCE;
    const arc = { ...segment, length, offset };
    offset += length;
    return arc;
  });

  const changeStatus = async (computer: Computer, status: ComputerState) => {
    setSavingId(computer.id);
    setError(null);
    try {
      await onStatusChange(computer.id, status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Holat saqlanmadi.');
    } finally {
      setSavingId(null);
    }
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await onAdd(newName);
      setNewName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kompyuter qo\'shilmadi.');
    } finally {
      setAdding(false);
    }
  };

  return <Panel title="Kompyuterlar holati" icon={<Monitor className="h-5 w-5" strokeWidth={1.75} />} action={<span className="text-sm text-slate-400">Barchasi: <span className="font-semibold text-brand-300">{formatCount(total)}</span></span>}>
    {total === 0 ? <p className="py-8 text-center text-sm text-slate-500">Yangi holatda kompyuter yo'q. Quyidan birinchi kompyuterni qo'shing.</p> : <div className="flex flex-1 items-center justify-around gap-4">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Kompyuterlar holati diagrammasi">
          <circle cx="90" cy="90" r={RADIUS} fill="none" strokeWidth="16" className="stroke-surface-600" />
          {arcs.map((arc) => arc.length > 0 ? <circle key={arc.status} cx="90" cy="90" r={RADIUS} fill="none" strokeWidth="16" stroke={arc.stroke} strokeLinecap="butt" strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`} strokeDashoffset={-arc.offset} className="transition-all duration-700" /> : null)}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-slate-50">{formatCount(counts.free)}</span><span className="text-xs font-medium text-slate-400">Bo'sh</span></div>
      </div>
      <ul className="flex flex-col gap-4">{SEGMENTS.map((segment) => <li key={segment.status} className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${segment.dot}`} /><span className="w-16 text-sm text-slate-300">{segment.label}</span><span className="w-6 text-right text-base font-semibold text-slate-100">{counts[segment.status]}</span></li>)}</ul>
    </div>}
    {error && <p role="alert" className="mt-3 text-xs text-danger-400">{error}</p>}
    <details open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)} className="mt-4 border-t border-surface-700 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-slate-400">Kompyuterlarni sozlash</summary>
      <form onSubmit={add} className="mt-3 flex gap-2"><input required maxLength={60} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Masalan: Kompyuter 1" aria-label="Yangi kompyuter nomi" className="min-w-0 flex-1 rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-xs text-slate-100" /><button type="submit" disabled={adding} className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Qo'shish</button></form>
    </details>
    {computers.length > 0 && <ul className="mt-4 grid grid-cols-1 gap-2 border-t border-surface-700 pt-4 sm:grid-cols-2">{computers.map((computer) => {
        const active = sessions.find((session) => session.computer_id === computer.id && session.ended_at === null);
        const activeSeconds = active ? Math.max(0, Math.floor((now - Date.parse(active.started_at)) / 1000)) : 0;
        const totalSeconds = (computer.total_runtime_seconds ?? 0) + activeSeconds;
        return <li key={computer.id} className="rounded-lg bg-surface-900/70 px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-200">{computer.name}</span><select aria-label={`${computer.name} holati`} value={computer.status} disabled={savingId === computer.id} onChange={(event) => void changeStatus(computer, event.target.value as ComputerState)} className="min-w-0 rounded border border-surface-600 bg-surface-800 px-1 py-1 text-xs"><option value="free">Bo'sh</option><option value="busy">Band</option><option value="broken">Nosoz</option></select></div><p className="mt-1 text-[10px] text-slate-500">{active ? `Joriy seans: ${formatDuration(activeSeconds)} | ` : ''}Jami ishladi: {formatDuration(totalSeconds)}</p></li>;
      })}</ul>}
  </Panel>;
}
