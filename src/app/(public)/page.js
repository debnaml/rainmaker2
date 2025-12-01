import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-purplebg p-6 text-textdark">
      <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-10 shadow-xl">
        <header className="space-y-4">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Welcome
          </span>
          <h1 className="text-3xl font-semibold text-primary sm:text-4xl">Rainmaker</h1>
        </header>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-textdark/80 sm:text-base">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere, lorem at pretium faucibus, augue lectus
            efficitur mauris, id pulvinar dui sapien vel massa. Suspendisse potenti. Curabitur at tellus lacus. Vestibulum
            fermentum ante ac nibh pretium tempor. Aenean luctus, enim eget suscipit dictum, justo lorem facilisis orci, vitae
            tristique felis risus eu lorem.
          </p>
          <p>
            Phasellus sit amet turpis ut nisl elementum lobortis. Donec luctus, ligula vitae cursus dictum, enim risus rhoncus
            ligula, eget consectetur tortor erat at arcu. Praesent vel diam eget ipsum viverra tincidunt. Integer venenatis
            posuere velit, vitae facilisis justo viverra ut.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-textdark transition hover:border-primary/40 hover:text-primary"
          >
            Explore the product
          </Link>
        </div>
      </section>
    </main>
  );
}
