'use client';

export default function LessonsPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-purplebg text-textdark">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-primary">Lessons</h1>
          <p className="text-base text-textdark/80">
            Explore a curated selection of lessons covering the latest Rainmaker strategies.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 12 }).map((_, index) => (
            <article key={index} className="rounded-lg border border-lines bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-primary">Lesson {index + 1}</h2>
              <p className="mt-2 text-sm text-textdark/70">
                A short description about the Rainmaker lesson content. Use this space to preview what
                learners can expect.
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-textdark/80">
                <li>Key insight #{index + 1}</li>
                <li>Practical takeaway #{index + 1}</li>
                <li>Resource link #{index + 1}</li>
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
