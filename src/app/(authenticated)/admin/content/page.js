'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';

const CONTENT_SECTION_ITEMS = [
  { key: 'lessons', label: 'Lessons', href: '/admin/content?view=lessons' },
  { key: 'modules', label: 'Modules', href: '/admin/content?view=modules' },
  { key: 'presenters', label: 'Presenters', href: '/admin/content?view=presenters' },
  { key: 'tags', label: 'Tags', href: '/admin/content?view=tags' },
  { key: 'formats', label: 'Formats', href: '/admin/content?view=formats' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, isAdmin, router]);

  const viewParam = searchParams?.get('view');

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    if (viewParam) return;
    router.replace('/admin/content?view=lessons');
  }, [isAdmin, loading, router, viewParam]);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    async function loadLessons() {
      try {
        setLessonsLoading(true);
        setLessonsError(null);

        const response = await fetch('/api/lessons?role=admin');
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load lessons.');
        }

        if (!isMounted) return;
        const lessonList = Array.isArray(payload.lessons) ? payload.lessons : [];
        setLessons(lessonList);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load lessons for admin content', error);
        setLessonsError(error.message ?? 'Unable to load lessons.');
      } finally {
        if (isMounted) setLessonsLoading(false);
      }
    }

    loadLessons();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const lessonRows = useMemo(() => {
    return lessons.map((lesson) => {
      const moduleTitle = lesson?.module?.title ?? 'Unassigned';
      const moduleType = lesson?.module?.type
        ? lesson.module.type.charAt(0).toUpperCase() + lesson.module.type.slice(1)
        : '—';
      const tags = Array.isArray(lesson?.tags) ? lesson.tags.slice(0, 3) : [];

      return {
        id: lesson.id,
        title: lesson.title ?? 'Untitled lesson',
        moduleTitle,
        moduleType,
        format: lesson.format ?? '—',
        duration: lesson.duration ?? '—',
        tags,
        createdAt: formatDate(lesson.created_at),
        enhanced: lesson.is_enhanced_only ? 'Yes' : 'No',
      };
    });
  }, [lessons]);

  if (loading || !isAdmin) {
    return null;
  }

  const activeHref = `/admin/content?view=${viewParam ?? 'lessons'}`;

  return (
    <div className="flex flex-col">
      <SubNav items={CONTENT_SECTION_ITEMS} activePathOverride={activeHref} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Lessons</h1>
            <p className="text-base text-textdark/80">
              Plan and publish Rainmaker lessons, bitesize refreshers, and stories. Build tools landing here soon.
            </p>
          </header>
          <section id="lessons" className="rounded-md bg-white p-6 shadow-sm">
            <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">Lessons</h2>
                <p className="text-sm text-textdark/70">Review and manage all lessons available in Rainmaker.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/admin/content/new')}
                className="inline-flex items-center justify-center rounded-full bg-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary"
              >
                New lesson
              </button>
            </header>
            {lessonsError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {lessonsError}
              </div>
            ) : null}
            {lessonsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-12 w-full animate-pulse rounded-md bg-purplebg/60" />
                ))}
              </div>
            ) : lessonRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-primary/30 bg-white/60 p-6 text-sm text-textdark/70">
                No lessons found yet. Create a lesson to get started.
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-[#E4E2EF]">
                <table className="min-w-full divide-y divide-[#E4E2EF] text-sm">
                  <thead className="bg-[#F8F7FC] text-xs font-semibold uppercase tracking-wide text-textdark/60">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Title</th>
                      <th scope="col" className="px-4 py-3 text-left">Module</th>
                      <th scope="col" className="px-4 py-3 text-left">Format</th>
                      <th scope="col" className="px-4 py-3 text-left">Duration</th>
                      <th scope="col" className="px-4 py-3 text-left">Tags</th>
                      <th scope="col" className="px-4 py-3 text-left">Enhanced</th>
                      <th scope="col" className="px-4 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E2EF] bg-white text-textdark/80">
                    {lessonRows.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-primary/5">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary">{lesson.title}</span>
                            <span className="text-xs uppercase tracking-wide text-textdark/50">{lesson.moduleType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{lesson.moduleTitle}</td>
                        <td className="px-4 py-3">{lesson.format}</td>
                        <td className="px-4 py-3">{lesson.duration}</td>
                        <td className="px-4 py-3">
                          {lesson.tags.length ? (
                            <div className="flex flex-wrap gap-2">
                              {lesson.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-textdark/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{lesson.enhanced}</td>
                        <td className="px-4 py-3">{lesson.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
