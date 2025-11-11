'use client';

import Image from 'next/image';
import Link from 'next/link';

function formatPosition(value) {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `#${numeric}`;
}

export default function PeerLeaderboardCard({
  position,
  linkHref = '/leaderboard',
  disabled = false,
  isLoading = false,
  className = '',
}) {
  const displayPosition = isLoading ? '…' : formatPosition(position);
  const containerStateClass = disabled ? 'opacity-60' : '';
  const linkClass = disabled
    ? 'pointer-events-none text-sm font-semibold text-textdark/50'
    : 'text-sm font-semibold text-action transition-colors hover:text-primary';
  const linkProps = disabled ? { tabIndex: -1, 'aria-disabled': true } : {};

  return (
    <article
      className={`flex items-center gap-4 border-b border-[#D9D9D9] p-6 text-left last:border-none md:border-b-0 md:border-r md:last:border-r-0 ${containerStateClass} ${className}`.trim()}
    >
      <Image src="/leaderboardicon.svg" alt="" width={56} height={56} aria-hidden="true" />
      <div className="flex flex-col gap-1">
  <span className="text-[20px] font-semibold text-primary">{displayPosition}</span>
        <span className="text-sm font-medium text-textdark/70">Peer Leaderboard</span>
        <Link
          href={linkHref}
          className={linkClass}
          {...linkProps}
        >
          View leaderboard
        </Link>
      </div>
    </article>
  );
}
