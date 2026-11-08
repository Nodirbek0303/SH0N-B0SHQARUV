import { ArrowDown, ArrowUp } from 'lucide-react';

interface TrendBadgeProps {
  value: number | null;
  goodWhenUp?: boolean;
}

export function TrendBadge({ value, goodWhenUp = true }: TrendBadgeProps) {
  if (value === null) return <span className="text-xs font-medium text-slate-500">-</span>;
  const isUp = value >= 0;
  const isGood = isUp === goodWhenUp;
  const tone = isGood ? 'text-success-400' : 'text-danger-400';
  const Icon = isUp ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {`${Math.abs(value)}%`}
    </span>
  );
}
