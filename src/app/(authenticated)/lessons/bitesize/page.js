'use client';

import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'All Lessons', href: '/lessons' },
  { label: 'Core Lessons', href: '/lessons/core' },
  { label: 'Bitesize Lessons', href: '/lessons/bitesize' },
  { label: 'Favourite Lessons', href: '/lessons/favourites' },
];

export default function BitesizeLessonsPage() {
  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto max-w-5xl px-6 py-[30px] space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
              Bitesize Lessons
            </h1>
            <p className="text-base text-textdark/80">
              Placeholder content for quick-hit lessons. Swap this out for short-form learning paths.
            </p>
          </header>
        </div>
      </main>
    </div>
  );
}
