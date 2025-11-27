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

const VALID_VIEWS = new Set(['lessons', 'modules']);
const DEFAULT_VIEW = 'lessons';
const MODULE_TYPE_DATALIST_ID = 'admin-module-types';

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

  const viewParam = searchParams?.get('view') ?? null;
  const currentView = VALID_VIEWS.has(viewParam) ? viewParam : DEFAULT_VIEW;
  const isLessonsView = currentView === 'lessons';
  const isModulesView = currentView === 'modules';

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState(null);
  const [lessonDeleteSubmittingId, setLessonDeleteSubmittingId] = useState(null);
  const [lessonDeleteError, setLessonDeleteError] = useState(null);

  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createType, setCreateType] = useState('');
  const [createSequence, setCreateSequence] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', type: '', sequence: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, isAdmin, router]);

  const hasViewParam = searchParams?.has('view') ?? false;
  const viewIsValid = viewParam ? VALID_VIEWS.has(viewParam) : false;

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    if (hasViewParam && viewIsValid) return;
    router.replace(`/admin/content?view=${DEFAULT_VIEW}`);
  }, [hasViewParam, isAdmin, loading, router, viewIsValid]);

  useEffect(() => {
    if (!isAdmin || !isLessonsView) return;

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
  }, [isAdmin, isLessonsView]);

  useEffect(() => {
    if (!isAdmin || !isModulesView) return;

    let isMounted = true;

    async function loadModules() {
      try {
        setModulesLoading(true);
        setModulesError(null);

        const response = await fetch('/api/admin/modules');
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load modules.');
        }

        if (!isMounted) return;
        const moduleList = Array.isArray(payload.modules) ? payload.modules : [];
        setModules(moduleList);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load modules for admin content', error);
        setModulesError(error.message ?? 'Unable to load modules.');
      } finally {
        if (isMounted) setModulesLoading(false);
      }
    }

    loadModules();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isModulesView]);

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

  const moduleTypeOptions = useMemo(() => {
    const unique = new Set();
    modules.forEach((module) => {
      if (module?.type) {
        unique.add(module.type);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [modules]);

  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      const typeA = a?.type ? a.type.toLowerCase() : '';
      const typeB = b?.type ? b.type.toLowerCase() : '';
      if (typeA !== typeB) {
        return typeA.localeCompare(typeB);
      }
      const sequenceAValue = Number(a?.sequence);
      const sequenceBValue = Number(b?.sequence);
      const sequenceA = Number.isFinite(sequenceAValue) ? sequenceAValue : Number.POSITIVE_INFINITY;
      const sequenceB = Number.isFinite(sequenceBValue) ? sequenceBValue : Number.POSITIVE_INFINITY;
      if (sequenceA !== sequenceB) {
        return sequenceA - sequenceB;
      }
      return String(a?.title ?? '').localeCompare(String(b?.title ?? ''));
    });
  }, [modules]);

  const pageHeading = isModulesView ? 'Modules' : 'Lessons';
  const pageDescription = isModulesView
    ? 'Organise lessons into modules and control their order in Rainmaker.'
    : 'Plan and publish Rainmaker lessons, bitesize refreshers, and stories. Build tools landing here soon.';

  if (loading || !isAdmin) {
    return null;
  }

  const activeHref = `/admin/content?view=${currentView}`;

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateType('');
    setCreateSequence('');
    setCreateError(null);
  };

  const handleEditLesson = (lessonId) => {
    if (!lessonId) return;
    router.push(`/admin/content/${lessonId}/edit`);
  };

  const handleDeleteLesson = async (lessonId) => {
    const confirmed = window.confirm('Delete this lesson? This action cannot be undone.');
    if (!confirmed) return;

    setLessonDeleteSubmittingId(lessonId);
    setLessonDeleteError(null);

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let message = 'Unable to delete lesson.';
        try {
          const responseBody = await response.json();
          if (responseBody?.error) {
            message = responseBody.error;
          }
        } catch (parseError) {
          // response not JSON, ignore
        }
        throw new Error(message);
      }

      setLessons((previous) => previous.filter((lesson) => lesson.id !== lessonId));
    } catch (error) {
      console.error('Failed to delete lesson', error);
      setLessonDeleteError(error.message ?? 'Unable to delete lesson.');
    } finally {
      setLessonDeleteSubmittingId(null);
    }
  };

  const handleCreateModule = async (event) => {
    event.preventDefault();
    if (!createTitle.trim()) {
      setCreateError('Title is required.');
      return;
    }

    let sequenceValue = null;
    if (createSequence.trim()) {
      const parsedSequence = Number(createSequence);
      if (!Number.isFinite(parsedSequence)) {
        setCreateError('Sequence must be a number.');
        return;
      }
      sequenceValue = parsedSequence;
    }

    const payload = {
      title: createTitle.trim(),
      type: createType.trim() ? createType.trim() : null,
      sequence: sequenceValue,
    };

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.error ?? 'Unable to create module.');
      }

      if (responseBody?.module) {
        setModules((previous) => [...previous, responseBody.module]);
      }

      setShowCreateForm(false);
      resetCreateForm();
    } catch (error) {
      console.error('Failed to create module', error);
      setCreateError(error.message ?? 'Unable to create module.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditClick = (module) => {
    setEditingModuleId(module.id);
    setEditForm({
      title: module?.title ?? '',
      type: module?.type ?? '',
      sequence:
        module?.sequence !== null && module?.sequence !== undefined
          ? String(module.sequence)
          : '',
    });
    setEditError(null);
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setEditingModuleId(null);
    setEditForm({ title: '', type: '', sequence: '' });
    setEditError(null);
  };

  const handleSaveModule = async () => {
    if (!editingModuleId) return;
    if (!editForm.title.trim()) {
      setEditError('Title is required.');
      return;
    }

    let sequenceValue = null;
    if (editForm.sequence.trim()) {
      const parsedSequence = Number(editForm.sequence);
      if (!Number.isFinite(parsedSequence)) {
        setEditError('Sequence must be a number.');
        return;
      }
      sequenceValue = parsedSequence;
    }

    const payload = {
      title: editForm.title.trim(),
      type: editForm.type.trim() ? editForm.type.trim() : null,
      sequence: sequenceValue,
    };

    setEditSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/admin/modules/${editingModuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.error ?? 'Unable to update module.');
      }

      if (responseBody?.module) {
        setModules((previous) =>
          previous.map((module) => (module.id === editingModuleId ? responseBody.module : module))
        );
      }

      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update module', error);
      setEditError(error.message ?? 'Unable to update module.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    const confirmed = window.confirm('Delete this module? Existing lessons will remain but become unassigned.');
    if (!confirmed) return;

    setDeleteSubmittingId(moduleId);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let message = 'Unable to delete module.';
        try {
          const responseBody = await response.json();
          if (responseBody?.error) {
            message = responseBody.error;
          }
        } catch (parseError) {
          // no-op
        }
        throw new Error(message);
      }

      setModules((previous) => previous.filter((module) => module.id !== moduleId));
      if (editingModuleId === moduleId) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Failed to delete module', error);
      setDeleteError(error.message ?? 'Unable to delete module.');
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <SubNav items={CONTENT_SECTION_ITEMS} activePathOverride={activeHref} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">{pageHeading}</h1>
            <p className="text-base text-textdark/80">{pageDescription}</p>
          </header>

          {isLessonsView ? (
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
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{lessonsError}</div>
              ) : null}
              {lessonDeleteError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{lessonDeleteError}</div>
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
                        <th scope="col" className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E2EF] bg-white text-textdark/80">
                      {lessonRows.map((lesson) => {
                        const isDeletingLesson = lessonDeleteSubmittingId === lesson.id;

                        return (
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
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditLesson(lesson.id)}
                                className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                                disabled={isDeletingLesson}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isDeletingLesson}
                              >
                                {isDeletingLesson ? 'Removing…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {isModulesView ? (
            <section id="modules" className="rounded-md bg-white p-6 shadow-sm">
              <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Modules</h2>
                  <p className="text-sm text-textdark/70">Manage module details, types, and ordering.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((value) => !value);
                    setCreateError(null);
                    if (showCreateForm) {
                      resetCreateForm();
                    }
                    setEditingModuleId(null);
                    setEditError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary"
                >
                  {showCreateForm ? 'Close form' : 'New module'}
                </button>
              </header>

              {modulesError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{modulesError}</div>
              ) : null}
              {deleteError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{deleteError}</div>
              ) : null}

              {modulesLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-12 w-full animate-pulse rounded-md bg-purplebg/60" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {showCreateForm ? (
                    <form className="space-y-4 rounded-md border border-[#E4E2EF] p-4" onSubmit={handleCreateModule}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col text-sm font-medium text-primary">
                          Title *
                          <input
                            type="text"
                            value={createTitle}
                            onChange={(event) => setCreateTitle(event.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="e.g. Core Skills"
                            required
                            disabled={createSubmitting}
                          />
                        </label>
                        <label className="flex flex-col text-sm font-medium text-primary">
                          Type
                          <input
                            type="text"
                            value={createType}
                            onChange={(event) => setCreateType(event.target.value)}
                            list={moduleTypeOptions.length ? MODULE_TYPE_DATALIST_ID : undefined}
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="e.g. Core, Bitesize"
                            disabled={createSubmitting}
                          />
                        </label>
                        <label className="flex flex-col text-sm font-medium text-primary">
                          Sequence
                          <input
                            type="number"
                            value={createSequence}
                            onChange={(event) => setCreateSequence(event.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="e.g. 1"
                            disabled={createSubmitting}
                          />
                        </label>
                      </div>
                      {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateForm(false);
                            resetCreateForm();
                          }}
                          className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                          disabled={createSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={createSubmitting}
                          className="inline-flex items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {createSubmitting ? 'Saving…' : 'Save module'}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {moduleTypeOptions.length ? (
                    <datalist id={MODULE_TYPE_DATALIST_ID}>
                      {moduleTypeOptions.map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  ) : null}

                  {sortedModules.length === 0 ? (
                    <div className="rounded-md border border-dashed border-primary/30 bg-white/60 p-6 text-sm text-textdark/70">
                      No modules yet. Create a module to organise lessons.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-md border border-[#E4E2EF]">
                      <table className="min-w-full divide-y divide-[#E4E2EF] text-sm">
                        <thead className="bg-[#F8F7FC] text-xs font-semibold uppercase tracking-wide text-textdark/60">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left">Title</th>
                            <th scope="col" className="px-4 py-3 text-left">Type</th>
                            <th scope="col" className="px-4 py-3 text-left">Sequence</th>
                            <th scope="col" className="px-4 py-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E2EF] bg-white text-textdark/80">
                          {sortedModules.map((module) => {
                            const isEditing = editingModuleId === module.id;
                            const isDeleting = deleteSubmittingId === module.id;
                            const sequenceNumber = Number(module?.sequence);
                            const hasSequence = Number.isFinite(sequenceNumber);

                            return (
                              <tr key={module.id} className="hover:bg-primary/5">
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editForm.title}
                                      onChange={(event) =>
                                        setEditForm((previous) => ({ ...previous, title: event.target.value }))
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      disabled={editSubmitting}
                                      required
                                    />
                                  ) : (
                                    <span className="font-semibold text-primary">{module.title ?? 'Untitled module'}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editForm.type}
                                      onChange={(event) =>
                                        setEditForm((previous) => ({ ...previous, type: event.target.value }))
                                      }
                                      list={moduleTypeOptions.length ? MODULE_TYPE_DATALIST_ID : undefined}
                                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      disabled={editSubmitting}
                                    />
                                  ) : (
                                    module.type ? module.type : <span className="text-xs text-textdark/50">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editForm.sequence}
                                      onChange={(event) =>
                                        setEditForm((previous) => ({ ...previous, sequence: event.target.value }))
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      disabled={editSubmitting}
                                    />
                                  ) : hasSequence ? (
                                    sequenceNumber
                                  ) : (
                                    <span className="text-xs text-textdark/50">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={handleSaveModule}
                                          className="inline-flex items-center justify-center rounded-full bg-action px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                                          disabled={editSubmitting}
                                        >
                                          {editSubmitting ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelEdit}
                                          className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                                          disabled={editSubmitting}
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(module)}
                                        className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                                        disabled={isDeleting}
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteModule(module.id)}
                                      className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                                      disabled={isDeleting || editSubmitting}
                                    >
                                      {isDeleting ? 'Removing…' : 'Delete'}
                                    </button>
                                  </div>
                                  {isEditing && editError ? (
                                    <p className="mt-2 text-xs text-red-600">{editError}</p>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
