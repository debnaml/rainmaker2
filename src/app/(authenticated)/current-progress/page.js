'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProgressDonut from '~/components/ProgressDonut';
import SubNav from '~/components/SubNav';
import { useAuth } from '/lib/authContext';

const SUB_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Current Progress', href: '/current-progress' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

const ROLE_PARAM_FALLBACK = 'normal';

function LessonStatusBadge({ status }) {
  const normalized = status ?? 'not_started';
  if (normalized === 'completed') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
        ✓
      </span>
    );
  }

  if (normalized === 'in_progress') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary text-xs font-semibold text-primary">
        •
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D9D9D9] text-xs font-semibold text-[#D9D9D9]">
      •
    </span>
  );
}

export default function CurrentProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [coreLessons, setCoreLessons] = useState([]);
  const [bitesizeLessons, setBitesizeLessons] = useState([]);
  const [storiesLessons, setStoriesLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadData() {
      if (!user) {
        setCoreLessons([]);
        setBitesizeLessons([]);
        setStoriesLessons([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          role: user.role ?? ROLE_PARAM_FALLBACK,
          progressFor: user.id,
        });

        const [coreResponse, bitesizeResponse, storiesResponse] = await Promise.all([
          fetch(`/api/lessons?${params.toString()}&moduleType=core`, { signal: controller.signal }),
          fetch(`/api/lessons?${params.toString()}&moduleType=bitesize`, { signal: controller.signal }),
          fetch(`/api/lessons?${params.toString()}&moduleType=stories`, { signal: controller.signal }),
        ]);

        const corePayload = await coreResponse.json();
        const bitesizePayload = await bitesizeResponse.json();
        const storiesPayload = await storiesResponse.json();

        if (!coreResponse.ok) {
          throw new Error(corePayload.error ?? 'Unable to load core lessons.');
        }

        if (!bitesizeResponse.ok) {
          throw new Error(bitesizePayload.error ?? 'Unable to load bitesize lessons.');
        }

        if (!storiesResponse.ok) {
          throw new Error(storiesPayload.error ?? 'Unable to load stories.');
        }

        if (!isMounted) return;

        setCoreLessons(Array.isArray(corePayload.lessons) ? corePayload.lessons : []);
        setBitesizeLessons(Array.isArray(bitesizePayload.lessons) ? bitesizePayload.lessons : []);
        setStoriesLessons(Array.isArray(storiesPayload.lessons) ? storiesPayload.lessons : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load progress overview', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!authLoading) {
      loadData();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [authLoading, user]);

  const groupedCore = useMemo(() => {
    const modules = new Map();

    coreLessons.forEach((lesson) => {
      const moduleId = lesson.module?.id ?? 'unassigned';
      const moduleTitle = lesson.module?.title ?? 'Independent lessons';
      const moduleSequence = lesson.module?.sequence ?? 9999;

      if (!modules.has(moduleId)) {
        modules.set(moduleId, { title: moduleTitle, sequence: moduleSequence, lessons: [] });
      }

      modules.get(moduleId).lessons.push(lesson);
    });

    return Array.from(modules.values())
      .sort((a, b) => a.sequence - b.sequence || a.title.localeCompare(b.title))
      .map((module) => ({
        ...module,
        lessons: module.lessons.sort((a, b) => {
          const seqA = a.sequence ?? 9999;
          const seqB = b.sequence ?? 9999;
          if (seqA !== seqB) return seqA - seqB;
          return (a.title ?? '').localeCompare(b.title ?? '');
        }),
      }));
  }, [coreLessons]);

  const bitesizeSorted = useMemo(() => {
    return [...bitesizeLessons].sort((a, b) => {
      const seqA = a.sequence ?? 9999;
      const seqB = b.sequence ?? 9999;
      if (seqA !== seqB) return seqA - seqB;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [bitesizeLessons]);

  const storiesSorted = useMemo(() => {
    return [...storiesLessons].sort((a, b) => {
      const seqA = a.sequence ?? 9999;
      const seqB = b.sequence ?? 9999;
      if (seqA !== seqB) return seqA - seqB;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [storiesLessons]);

  const coreCompletion = useMemo(() => {
    if (!coreLessons.length) return 0;
    const completed = coreLessons.filter((lesson) => lesson.progress?.status === 'completed').length;
    return Math.round((completed / coreLessons.length) * 100);
  }, [coreLessons]);

  const bitesizeCompletion = useMemo(() => {
    if (!bitesizeLessons.length) return 0;
    const completed = bitesizeLessons.filter((lesson) => lesson.progress?.status === 'completed').length;
    return Math.round((completed / bitesizeLessons.length) * 100);
  }, [bitesizeLessons]);

  const storiesCompletion = useMemo(() => {
    if (!storiesLessons.length) return 0;
    const completed = storiesLessons.filter((lesson) => lesson.progress?.status === 'completed').length;
    return Math.round((completed / storiesLessons.length) * 100);
  }, [storiesLessons]);

  const renderLessonItem = (lesson) => {
    const status = lesson.progress?.status ?? 'not_started';
    return (
      <Link
        key={lesson.id ?? lesson.title}
        href={lesson.id ? `/lessons/${lesson.id}` : lesson.url ?? '#'}
        className="flex items-center justify-between gap-2 py-2 text-sm text-textdark"
      >
        <div className="flex flex-1 items-center gap-3">
          <LessonStatusBadge status={status} />
          <div className="flex flex-1 flex-col">
            <span className="font-medium leading-snug text-[#237781] break-words">
              {lesson.title ?? 'Untitled lesson'}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Current Progress</h1>
            <p className="text-base text-textdark/80">
              Track how you are moving through the core curriculum, quick bitesize refreshers, and upcoming stories.
            </p>
          </header>

          {authLoading || loading ? (
            <p className="text-sm text-textdark/70">Loading your progress…</p>
          ) : !user ? (
            <p className="text-sm text-textdark/70">Sign in to view your progress.</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <section className="flex flex-col gap-4 rounded-md bg-white p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-primary">Core</h2>
                    <p className="text-xs uppercase tracking-wide text-textdark/50">
                      {coreLessons.length} lessons
                    </p>
                  </div>
                  <ProgressDonut percent={coreCompletion} color="#331D4C" />
                </div>

                <div className="flex flex-col gap-5">
                  {groupedCore.length === 0 ? (
                    <p className="text-sm text-textdark/60">No core lessons available yet.</p>
                  ) : (
                    groupedCore.map((module) => (
                      <div key={module.title} className="space-y-1.5">
                        <h3 className="py-[15px] text-base font-semibold text-primary">
                          {module.title}
                        </h3>
                        <div className="space-y-1.5">
                          {module.lessons.map((lesson) => renderLessonItem(lesson))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-4 rounded-md bg-white p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-primary">Bitesize</h2>
                    <p className="text-xs uppercase tracking-wide text-textdark/50">
                      {bitesizeLessons.length} lessons
                    </p>
                  </div>
                  <ProgressDonut percent={bitesizeCompletion} />
                </div>

                <div className="space-y-1.5">
                  {bitesizeSorted.length === 0 ? (
                    <p className="text-sm text-textdark/60">No bitesize lessons available yet.</p>
                  ) : (
                    bitesizeSorted.map((lesson) => renderLessonItem(lesson))
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-4 rounded-md bg-white p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-primary">Stories</h2>
                    <p className="text-xs uppercase tracking-wide text-textdark/50">
                      {storiesLessons.length} stories
                    </p>
                  </div>
                  <ProgressDonut percent={storiesCompletion} color="#CBDD51" />
                </div>

                <div className="space-y-1.5">
                  {storiesSorted.length === 0 ? (
                    <p className="text-sm text-textdark/60">No stories available yet.</p>
                  ) : (
                    storiesSorted.map((lesson) => renderLessonItem(lesson))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
