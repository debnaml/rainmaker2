'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SubNav from '~/components/SubNav';
import { useAuth } from '/lib/authContext';

const SUB_NAV_ITEMS = [
  { label: 'All Lessons', href: '/lessons' },
  { label: 'Core Lessons', href: '/lessons/core' },
  { label: 'Bitesize Lessons', href: '/lessons/bitesize' },
  { label: 'Favourite Lessons', href: '/lessons/favourites' },
];

const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

const DEFAULT_PROGRESS = {
  status: 'not_started',
  progressPercent: 0,
  startedAt: null,
  completedAt: null,
  updatedAt: null,
  metadata: null,
};

function formatModuleType(type) {
  if (!type) return 'General';
  const lower = type.toLowerCase();
  if (lower === 'bitesize') return 'Bitesize';
  if (lower === 'core') return 'Core';
  return type;
}

function formatDuration(duration) {
  if (!duration) return 'Flexible length';
  return duration;
}

function ProgressPill({ status }) {
  const label = STATUS_LABELS[status] ?? 'Not started';
  const color = (() => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800';
      case 'skipped':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  })();

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>{label}</span>;
}

function ModuleProgressList({ lessons, currentLessonId }) {
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return (
      <div className="rounded-lg border border-[#D9D9D9] bg-white p-4 text-sm text-textdark/60">
        Additional lessons will appear here once this module is populated.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {lessons.map((lesson) => {
        const isCurrent = lesson.id === currentLessonId;
        const progressStatus = lesson.progress?.status ?? 'not_started';
        const circleClass = (() => {
          if (progressStatus === 'completed') return 'border-primary bg-primary text-white';
          if (progressStatus === 'in_progress') return 'border-primary bg-white text-primary';
          return 'border-[#D9D9D9] bg-white text-[#D9D9D9]';
        })();

        const circleInner = progressStatus === 'completed' ? '✓' : progressStatus === 'in_progress' ? '•' : '';

        const content = (
          <div className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${circleClass}`}
            >
              {circleInner}
            </span>
            <span
              className={`flex-1 text-sm leading-snug ${isCurrent ? 'font-semibold text-primary' : 'text-textdark/80'} break-words`}
            >
              {lesson.title}
            </span>
          </div>
        );

        if (isCurrent) {
          return (
            <li key={lesson.id} className="opacity-100">
              {content}
            </li>
          );
        }

        return (
          <li key={lesson.id} className="opacity-80 transition hover:opacity-100">
            <Link href={`/lessons/${lesson.id}`}>{content}</Link>
          </li>
        );
      })}
    </ul>
  );
}

function ResourcesList({ resources }) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-primary/30 bg-white/50 p-4 text-sm text-textdark/60">
        No additional resources yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {resources.map((resource) => (
        <li
          key={resource.id ?? resource.url ?? resource.title}
          className="rounded-lg border border-[#D9D9D9] bg-white p-3 text-sm"
        >
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-action"
          >
            {resource.title}
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function LessonContent({ lesson, progress, onStartLesson, progressBusy }) {
  const hasStarted = progress?.status && progress.status !== 'not_started';
  const showOverlay = !hasStarted && !progressBusy;

  const renderContent = () => {
    if (!lesson?.primaryContent?.url) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-primary/30 bg-white/50">
          <p className="text-sm text-textdark/60">Content coming soon.</p>
        </div>
      );
    }

    const format = lesson.primaryContent?.type?.toLowerCase() ?? '';
    const url = lesson.primaryContent.url;

    if (format.includes('video')) {
      return (
        <div className="relative h-64 overflow-hidden rounded-lg border border-[#D9D9D9] bg-black">
          <iframe
            src={url}
            title={lesson.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (format.includes('flip') || format.includes('snack')) {
      return (
        <div className="relative h-64 overflow-hidden rounded-lg border border-[#D9D9D9] bg-white">
          <iframe src={url} title={lesson.title} className="h-full w-full" />
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-[#D9D9D9] bg-white p-6 text-sm text-textdark/80">
        <p className="mb-4 font-medium text-textdark/80">Primary resource</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-action"
        >
          Open resource
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  };

  return (
    <div className="relative">
      {renderContent()}
      {showOverlay ? (
        <button
          type="button"
          onClick={onStartLesson}
          disabled={progressBusy}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/20 backdrop-blur-sm transition hover:bg-primary/30 disabled:opacity-80"
        >
          <span className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-lg">
            {progressBusy ? 'Starting…' : 'Start lesson'}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params?.lessonId;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState({ ...DEFAULT_PROGRESS });
  const [moduleLessons, setModuleLessons] = useState([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    if (!lessonId) return;

    const controller = new AbortController();
    let isActive = true;

    setHasAttemptedLoad(false);

    async function loadLesson() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (user?.id) params.set('userId', user.id);
        if (user?.role) params.set('role', user.role);

        const queryString = params.toString();
        const response = await fetch(`/api/lessons/${lessonId}${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load lesson.');
        }

        if (!isActive) return;

        setLesson(payload.lesson ?? null);
        setProgress(payload.progress ?? { ...DEFAULT_PROGRESS });
        setModuleLessons(payload.moduleLessons ?? []);
        setIsFavourite(Boolean(payload.favourite));
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load lesson', err);
        if (!isActive) return;
        setError(err.message);
        setLesson(null);
      } finally {
        if (!isActive) return;
        setLoading(false);
        setHasAttemptedLoad(true);
      }
    }

    loadLesson();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [lessonId, user?.id, user?.role]);

  const progressPercent = useMemo(() => {
    if (progress?.status === 'completed') return 100;
    if (progress?.progressPercent != null) {
      const clamped = Math.min(100, Math.max(0, Number(progress.progressPercent)));
      return Math.round(clamped);
    }
    return 0;
  }, [progress]);

  const moduleTypeLabel = formatModuleType(lesson?.module?.type);

  const handleUpdateProgress = async (updates) => {
    if (progressBusy) return;
    if (!user?.id) {
      setError('You need to be signed in to update progress.');
      return;
    }

    try {
      setProgressBusy(true);
      setError(null);

      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...updates }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update progress.');
      }

      setProgress(payload.progress ?? { ...DEFAULT_PROGRESS });
    } catch (err) {
      console.error('Failed to update progress', err);
      setError(err.message);
    } finally {
      setProgressBusy(false);
    }
  };

  const handleStartLesson = () => {
    if (progressBusy) return;
    if (progress?.status && progress.status !== 'not_started') return;
    handleUpdateProgress({ status: 'in_progress', progressPercent: progress?.progressPercent ?? 0 });
  };

  const handleMarkComplete = () => {
    if (progressBusy) return;
    handleUpdateProgress({ status: 'completed', progressPercent: 100 });
  };

  const handleToggleFavourite = async () => {
    if (!user?.id) {
      setError('You need to be signed in to save favourites.');
      return;
    }

    try {
      setFavouriteBusy(true);
      setError(null);

      const method = isFavourite ? 'DELETE' : 'POST';
      const response = await fetch(`/api/lessons/${lessonId}/favourite`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update favourites.');
      }

      setIsFavourite((prev) => Boolean(payload.favourite ?? !prev));
    } catch (err) {
      console.error('Failed to toggle favourite', err);
      setError(err.message);
    } finally {
      setFavouriteBusy(false);
    }
  };

  if (!lessonId) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-red-600">Unable to load lesson: missing identifier.</p>
        </div>
      </main>
    );
  }

  if (authLoading || loading || !hasAttemptedLoad) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-textdark/70">Loading lesson…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-textdark/70">Lesson not found.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="flex flex-col gap-4 border-b border-[#D9D9D9] pb-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-primary">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-textdark/70">
                <ProgressPill status={progress?.status ?? 'not_started'} />
                <span>{progressPercent}% complete</span>
                {lesson.duration ? <span>• {formatDuration(lesson.duration)}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleFavourite}
              disabled={favouriteBusy}
              className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                isFavourite ? 'text-primary hover:text-action' : 'text-textdark/70 hover:text-primary'
              } ${favouriteBusy ? 'opacity-60' : ''}`}
            >
              <span aria-hidden="true">{isFavourite ? '★' : '☆'}</span>
              {isFavourite ? 'Saved to favourites' : 'Save to favourites'}
            </button>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="space-y-6">
              <LessonContent
                lesson={lesson}
                progress={progress}
                onStartLesson={handleStartLesson}
                progressBusy={progressBusy}
              />

              {lesson.description ? (
                <div className="rounded-lg border border-[#D9D9D9] bg-white p-6 text-sm text-textdark/80">
                  {lesson.description}
                </div>
              ) : null}

              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">Lesson progress</h2>
                  {progress?.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      disabled={progressBusy}
                      className="rounded-full border border-primary px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
                    >
                      {progressBusy ? 'Updating…' : 'Mark complete'}
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm text-textdark/70">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6E6E6]">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs uppercase tracking-wide text-textdark/50">
                    <span>{progressPercent}% complete</span>
                    {progress?.updatedAt ? (
                      <span>Updated {new Date(progress.updatedAt).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">Discussion</h2>
                  <span className="text-xs uppercase tracking-wide text-textdark/50">Coming soon</span>
                </div>
                <p className="mt-4 text-sm text-textdark/70">
                  Conversation around this lesson will appear here. Share reflections, ask questions, or
                  collaborate with peers once comments are enabled.
                </p>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <h2 className="text-lg font-semibold text-primary">Lesson details</h2>
                <dl className="mt-4 space-y-3 text-sm text-textdark/80">
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Module</dt>
                    <dd className="font-medium text-primary">{lesson.module?.title ?? 'Independent lesson'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Type</dt>
                    <dd className="font-medium text-textdark/80">{moduleTypeLabel}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Format</dt>
                    <dd className="font-medium text-textdark/80">{lesson.format ?? 'General'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Duration</dt>
                    <dd className="font-medium text-textdark/80">{formatDuration(lesson.duration)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <h2 className="text-lg font-semibold text-primary">Resources</h2>
                <div className="mt-4">
                  <ResourcesList resources={lesson.resources} />
                </div>
              </div>

              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">Course progress</h2>
                  <span className="text-xs uppercase tracking-wide text-textdark/50">Module view</span>
                </div>
                <div className="mt-4">
                  <ModuleProgressList lessons={moduleLessons} currentLessonId={lesson.id} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
