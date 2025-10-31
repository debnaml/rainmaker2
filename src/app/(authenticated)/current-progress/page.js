'use client';

import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Current Progress', href: '/current-progress' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

export default function CurrentProgressPage() {
  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-start justify-center gap-6 px-6 py-[30px]">
          <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
            Current Progress
          </h1>
          <p className="max-w-2xl text-base text-textdark/80">
            Progress tracking overview placeholder. Replace this with data visualisations showing lesson
            completion, streaks, and achievements.
          </p>
        </div>
      </main>
    </div>
  );
}
