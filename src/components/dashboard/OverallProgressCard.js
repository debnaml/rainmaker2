'use client';

import Link from 'next/link';
import ProgressDonut from '~/components/ProgressDonut';

function formatPercent(value) {
  if (value == null) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}%`;
}

export default function OverallProgressCard({
  percent,
  linkHref = '#',
  isLoading = false,
  className = '',
}) {
  const displayValue = isLoading ? '…' : formatPercent(percent);
  return (
    <article
      className={`flex items-center gap-4 border-b border-[#D9D9D9] p-6 text-left last:border-none md:border-b-0 md:border-r md:last:border-r-0 ${className}`}
    >
      <ProgressDonut percent={percent ?? 0} size={72} thickness={10} color="#331D4C" label={isLoading ? '…' : undefined} />
      <div className="flex flex-col gap-1">
  <span className="text-[20px] font-semibold text-primary">{displayValue}</span>
  <span className="text-sm font-medium text-textdark/70">Overall Progress</span>
        <Link
          href={linkHref}
          className="text-sm font-semibold text-action transition-colors hover:text-primary"
        >
          Continue learning
        </Link>
      </div>
    </article>
  );
}
