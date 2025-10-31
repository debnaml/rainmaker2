'use client';

import { useAuth } from '/lib/authContext';
import { useRouter } from 'next/navigation';
import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Current Progress', href: '/current-progress' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-0 px-6 py-[30px]">
          <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
            {`Welcome back, ${firstName}`}
          </h1>
          <section className="grid min-h-[120px] w-full grid-cols-1 overflow-hidden rounded-[5px] bg-white md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="relative flex flex-col justify-center gap-2 border-b border-[#D9D9D9] p-6 text-left md:border-b-0 md:[&:not(:last-child)]:before:absolute md:[&:not(:last-child)]:before:right-0 md:[&:not(:last-child)]:before:top-5 md:[&:not(:last-child)]:before:bottom-5 md:[&:not(:last-child)]:before:w-px md:[&:not(:last-child)]:before:bg-[#D9D9D9] md:[&:not(:last-child)]:before:content-[''] last:border-none"
              >
                <p className="text-sm font-medium text-textdark/70">Stat placeholder {item}</p>
                <p className="text-2xl font-semibold text-primary">123</p>
                <p className="text-xs uppercase tracking-wide text-textdark/50">Updated moments ago</p>
              </div>
            ))}
          </section>
          <section className="mt-8 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            <article className="flex flex-col gap-6 rounded-[5px] bg-white p-6 md:col-span-2">
              <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex max-w-2xl flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-textdark/60">Popular Lesson</span>
                  <h2 className="text-2xl font-semibold text-primary">Consultative Rainmaking Basics</h2>
                  <p className="text-sm text-textdark/70">
                    Dive back into the module that helps you build lasting client relationships with practical listening
                    frameworks and actionable prep guides.
                  </p>
                </div>
                <button className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-action">
                  Resume lesson
                </button>
              </header>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-wide text-textdark/50">Completion</dt>
                  <dd className="text-lg font-semibold text-textdark">68%</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-wide text-textdark/50">Last activity</dt>
                  <dd className="text-lg font-semibold text-textdark">3 days ago</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-wide text-textdark/50">Coach</dt>
                  <dd className="text-lg font-semibold text-textdark">Jordan Blake</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-wide text-textdark/50">Estimated time</dt>
                  <dd className="text-lg font-semibold text-textdark">18 minutes</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 text-sm text-primary">
                <span className="rounded-full border border-primary px-3 py-1 text-xs uppercase tracking-wide text-primary/90">Discovery</span>
                <span className="rounded-full border border-primary px-3 py-1 text-xs uppercase tracking-wide text-primary/90">Listening</span>
                <span className="rounded-full border border-primary px-3 py-1 text-xs uppercase tracking-wide text-primary/90">Prep</span>
              </div>
            </article>
            <article className="flex flex-col gap-4 rounded-[5px] bg-white p-6">
              <span className="text-xs uppercase tracking-wide text-textdark/60">Story Spotlight</span>
              <h2 className="text-xl font-semibold text-primary">Negotiating the Partnership</h2>
              <p className="text-sm text-textdark/70">
                Pick up the interactive story where you left off and practice converting a warm lead into a new
                engagement.
              </p>
              <div className="mt-auto flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-textdark/50">Progress</span>
                  <span className="text-sm font-medium text-primary">45%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#D9D9D9]/60">
                  <div className="h-full w-[45%] rounded-full bg-primary" />
                </div>
                <button className="inline-flex h-10 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                  Continue story
                </button>
              </div>
            </article>
          </section>
          
        </div>
      </main>
    </div>
  );
}
