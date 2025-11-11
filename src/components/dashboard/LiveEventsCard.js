'use client';

import Link from 'next/link';
import ProgressDonut from '~/components/ProgressDonut';

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCount(completed, total) {
  const safeTotal = toNumber(total);
  const safeCompleted = toNumber(completed);
  return `${safeCompleted} of ${safeTotal}`;
}

export default function LiveEventsCard({
  completed,
  total,
  linkHref = '#',
  isLoading = false,
  className = '',
}) {
  const safeTotal = toNumber(total);
  const safeCompleted = toNumber(completed);
  const percent = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  const displayValue = isLoading ? '…' : formatCount(safeCompleted, safeTotal);
  const label = isLoading ? '…' : `${percent}%`;

  return (
    <article
      className={`flex items-center gap-4 border-b border-[#D9D9D9] p-6 text-left last:border-none md:border-b-0 md:border-r md:last:border-r-0 ${className}`}
    >
      <ProgressDonut
        percent={percent}
        size={72}
        thickness={10}
        color="#CBDD52"
        label={label}
      />
      <div className="flex flex-col gap-1">
        <span className="text-[20px] font-semibold text-primary">{displayValue}</span>
        <span className="text-sm font-medium text-textdark/70">Live Events</span>
        <Link
          href={linkHref}
          className="text-sm font-semibold text-action transition-colors hover:text-primary"
        >
          View events
        </Link>
      </div>
    </article>
  );
}
