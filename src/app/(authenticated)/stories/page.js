'use client';

export default function StoriesPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-purplebg text-textdark">
      <div className="mx-auto max-w-5xl px-6 py-[30px] space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
            Stories
          </h1>
          <p className="text-base text-textdark/80">
            Discover success stories from Rainmaker teams and partners across the globe.
          </p>
        </header>
        <section className="space-y-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="rounded-lg border border-lines bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
                <div className="h-32 w-full rounded-md bg-mint/40 md:w-48" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-primary">Story Title {index + 1}</h2>
                  <p className="text-sm text-textdark/70">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc volutpat dui eget augue
                    facilisis, eget tincidunt nibh vehicula. Nullam vulputate vulputate libero ut venenatis.
                  </p>
                  <p className="text-xs uppercase tracking-wide text-textdark/60">Updated 3 days ago</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
