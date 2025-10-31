'use client';

import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Current Progress', href: '/current-progress' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-6 py-[30px]">
          <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
            Leaderboard
          </h1>
          <p className="text-base text-textdark/80">
            Placeholder leaderboard content. Surface top performers, team standings, and recent activity
            here.
          </p>
        </div>
      </main>
    </div>
  );
}
