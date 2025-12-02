'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import { ALLOWED_MODULE_TYPES } from '/lib/modules/constants';
import SubNav from '~/components/SubNav';

const CONTENT_SECTION_ITEMS = [
  { key: 'lessons', label: 'Lessons', href: '/admin/content?view=lessons' },
  { key: 'modules', label: 'Modules', href: '/admin/content?view=modules' },
  { key: 'presenters', label: 'Presenters', href: '/admin/content?view=presenters' },
  { key: 'tags', label: 'Tags', href: '/admin/content?view=tags' },
  { key: 'formats', label: 'Formats', href: '/admin/content?view=formats' },
];

const VALID_VIEWS = new Set(['lessons', 'modules', 'presenters']);
const DEFAULT_VIEW = 'lessons';
const MODULE_TYPE_DATALIST_ID = 'admin-module-types';
const INITIAL_PRESENTER_FORM = {
  name: '',
};
const LESSON_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'sequence', label: 'Module & lesson order' },
  { value: 'title-asc', label: 'Title A → Z' },
  { value: 'title-desc', label: 'Title Z → A' },
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

  const viewParam = searchParams?.get('view') ?? null;
  const currentView = VALID_VIEWS.has(viewParam) ? viewParam : DEFAULT_VIEW;
  const isLessonsView = currentView === 'lessons';
  const isModulesView = currentView === 'modules';
  const isPresentersView = currentView === 'presenters';

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState(null);
  const [lessonDeleteSubmittingId, setLessonDeleteSubmittingId] = useState(null);
  const [lessonDeleteError, setLessonDeleteError] = useState(null);
  const [lessonSearch, setLessonSearch] = useState('');
  const [lessonModuleFilter, setLessonModuleFilter] = useState('all');
  const [lessonFormatFilter, setLessonFormatFilter] = useState('all');
  const [lessonEnhancedFilter, setLessonEnhancedFilter] = useState('all');
  const [lessonSortOrder, setLessonSortOrder] = useState('newest');

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
  const allowedModuleTypesLabel = useMemo(
    () => ALLOWED_MODULE_TYPES.join(', '),
    []
  );

  const [presenters, setPresenters] = useState([]);
  const [presentersLoading, setPresentersLoading] = useState(false);
  const [presentersError, setPresentersError] = useState(null);
  const [presenterForm, setPresenterForm] = useState(INITIAL_PRESENTER_FORM);
  const [presenterFormError, setPresenterFormError] = useState(null);
  const [presenterSubmitting, setPresenterSubmitting] = useState(false);
  const [editingPresenterId, setEditingPresenterId] = useState(null);
  const [presenterDeleteSubmittingId, setPresenterDeleteSubmittingId] = useState(null);
  const [presenterDeleteError, setPresenterDeleteError] = useState(null);

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

  useEffect(() => {
    if (!isAdmin || !isPresentersView) return;

    const controller = new AbortController();

    async function loadPresenters() {
      try {
        setPresentersLoading(true);
        setPresentersError(null);

        const response = await fetch('/api/admin/presenters', { signal: controller.signal });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load presenters.');
        }

        setPresenters(Array.isArray(payload.presenters) ? payload.presenters : []);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load presenters for admin content', error);
        setPresentersError(error.message ?? 'Unable to load presenters.');
      } finally {
        setPresentersLoading(false);
      }
    }

    loadPresenters();

    return () => controller.abort();
  }, [isAdmin, isPresentersView]);

  const lessonModuleOptions = useMemo(() => {
    const map = new Map();
    lessons.forEach((lesson) => {
      const moduleId = lesson?.module?.id != null ? String(lesson.module.id) : 'unassigned';
      const label = lesson?.module?.title ?? 'Unassigned';
      const sequence = lesson?.module?.sequence ?? Number.MAX_SAFE_INTEGER;
      if (!map.has(moduleId)) {
        map.set(moduleId, { id: moduleId, label, sequence });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.sequence !== b.sequence) return a.sequence - b.sequence;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }, [lessons]);

  const lessonFormatOptions = useMemo(() => {
    const formats = new Set();
    lessons.forEach((lesson) => {
      if (lesson?.format) {
        formats.add(lesson.format);
      }
    });
    return Array.from(formats).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const normaliseSequence = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
    };

    const normaliseTimestamp = (value) => {
      if (!value) return 0;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const searchValue = lessonSearch.trim().toLowerCase();

    const filtered = lessons.filter((lesson) => {
      const moduleId = lesson?.module?.id != null ? String(lesson.module.id) : 'unassigned';
      const moduleTitle = lesson?.module?.title ?? 'Unassigned';
      const format = lesson?.format ?? '';
      const title = lesson?.title ?? '';
      const description = lesson?.description ?? '';
      const tags = Array.isArray(lesson?.tags) ? lesson.tags.join(' ') : '';
      const enhanced = Boolean(lesson?.is_enhanced_only);

      const matchesSearch = searchValue
        ? `${title} ${description} ${moduleTitle} ${format} ${tags}`.toLowerCase().includes(searchValue)
        : true;

      const matchesModule = lessonModuleFilter === 'all' ? true : moduleId === lessonModuleFilter;

      const matchesFormat =
        lessonFormatFilter === 'all'
          ? true
          : format.toLowerCase() === lessonFormatFilter.toLowerCase();

      const matchesEnhanced = (() => {
        if (lessonEnhancedFilter === 'all') return true;
        if (lessonEnhancedFilter === 'enhanced') return enhanced;
        if (lessonEnhancedFilter === 'standard') return !enhanced;
        return true;
      })();

      return matchesSearch && matchesModule && matchesFormat && matchesEnhanced;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const createdA = normaliseTimestamp(a?.created_at);
      const createdB = normaliseTimestamp(b?.created_at);
      const moduleSequenceA = normaliseSequence(a?.module?.sequence);
      const moduleSequenceB = normaliseSequence(b?.module?.sequence);
      const lessonSequenceA = normaliseSequence(a?.sequence);
      const lessonSequenceB = normaliseSequence(b?.sequence);
      const titleA = (a?.title ?? '').toLowerCase();
      const titleB = (b?.title ?? '').toLowerCase();

      switch (lessonSortOrder) {
        case 'oldest':
          return createdA - createdB;
        case 'sequence':
          if (moduleSequenceA !== moduleSequenceB) return moduleSequenceA - moduleSequenceB;
          if (lessonSequenceA !== lessonSequenceB) return lessonSequenceA - lessonSequenceB;
          return titleA.localeCompare(titleB);
        case 'title-asc':
          return titleA.localeCompare(titleB);
        case 'title-desc':
          return titleB.localeCompare(titleA);
        case 'newest':
        default:
          return createdB - createdA;
      }
    });

    return sorted;
  }, [lessons, lessonSearch, lessonModuleFilter, lessonFormatFilter, lessonEnhancedFilter, lessonSortOrder]);

  const hasLessonFilters = useMemo(() => {
    return (
      Boolean(lessonSearch.trim()) ||
      lessonModuleFilter !== 'all' ||
      lessonFormatFilter !== 'all' ||
      lessonEnhancedFilter !== 'all' ||
      lessonSortOrder !== 'newest'
    );
  }, [lessonSearch, lessonModuleFilter, lessonFormatFilter, lessonEnhancedFilter, lessonSortOrder]);

  const lessonRows = useMemo(() => {
    return filteredLessons.map((lesson) => {
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
  }, [filteredLessons]);

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

  const sortedPresenters = useMemo(() => {
    if (!Array.isArray(presenters)) return [];
    return [...presenters].sort((a, b) => {
      const nameA = (a?.name ?? '').toLowerCase();
      const nameB = (b?.name ?? '').toLowerCase();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }
      const updatedA = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
      const updatedB = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
      return updatedB - updatedA;
    });
  }, [presenters]);

  const presenterCount = sortedPresenters.length;
  const presenterCountLabel = presenterCount === 1 ? '1 presenter' : `${presenterCount} presenters`;

  let pageHeading = 'Lessons';
  let pageDescription = 'Plan and publish Rainmaker lessons, bitesize refreshers, and stories. Build tools landing here soon.';
  if (isModulesView) {
    pageHeading = 'Modules';
    pageDescription = 'Organise lessons into modules and control their order in Rainmaker.';
  } else if (isPresentersView) {
    pageHeading = 'Presenters';
    pageDescription = 'Maintain the presenter names and titles that appear throughout Rainmaker lessons.';
  }

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

  const resetPresenterForm = () => {
    setPresenterForm(INITIAL_PRESENTER_FORM);
    setPresenterFormError(null);
    setPresenterSubmitting(false);
    setEditingPresenterId(null);
  };

  const handlePresenterInputChange = (event) => {
    const { name, value } = event.target;
    setPresenterForm((previous) => ({ ...previous, [name]: value }));
  };

  const handlePresenterSubmit = async (event) => {
    event.preventDefault();
    if (presenterSubmitting) return;

    const nameValue = presenterForm.name.trim();
    if (!nameValue) {
      setPresenterFormError('Name is required.');
      return;
    }

    const payload = {
      name: nameValue,
    };

    const endpoint = editingPresenterId
      ? `/api/admin/presenters/${editingPresenterId}`
      : '/api/admin/presenters';
    const method = editingPresenterId ? 'PATCH' : 'POST';

    setPresenterSubmitting(true);
    setPresenterFormError(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to save presenter.');
      }

      const presenterRecord = result.presenter;
      if (presenterRecord) {
        setPresenters((previous) => {
          if (editingPresenterId) {
            return previous.map((item) => (item.id === presenterRecord.id ? presenterRecord : item));
          }
          return [presenterRecord, ...previous];
        });
      }

      resetPresenterForm();
    } catch (error) {
      console.error('Failed to submit presenter form', error);
      setPresenterFormError(error.message ?? 'Unable to save presenter.');
      setPresenterSubmitting(false);
    }
  };

  const handlePresenterEdit = (presenter) => {
    if (!presenter) return;
    setEditingPresenterId(presenter.id);
    setPresenterForm({
      name: presenter.name ?? '',
    });
    setPresenterFormError(null);
  };

  const handlePresenterCancelEdit = () => {
    resetPresenterForm();
  };

  const handlePresenterDelete = async (presenterId) => {
    if (!presenterId) return;
    const confirmed = window.confirm('Delete this presenter? They will be removed from any lessons.');
    if (!confirmed) return;

    setPresenterDeleteSubmittingId(presenterId);
    setPresenterDeleteError(null);

    try {
      const response = await fetch(`/api/admin/presenters/${presenterId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Unable to delete presenter.');
      }

      setPresenters((previous) => previous.filter((item) => item.id !== presenterId));
      if (editingPresenterId === presenterId) {
        resetPresenterForm();
      }
    } catch (error) {
      console.error('Failed to delete presenter', error);
      setPresenterDeleteError(error.message ?? 'Unable to delete presenter.');
    } finally {
      setPresenterDeleteSubmittingId(null);
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

    const normalizedType = createType.trim() ? createType.trim().toLowerCase() : null;
    if (normalizedType && !ALLOWED_MODULE_TYPES.includes(normalizedType)) {
      setCreateError(`Type must be one of: ${allowedModuleTypesLabel}.`);
      return;
    }

    const payload = {
      title: createTitle.trim(),
      type: normalizedType,
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

    const normalizedType = editForm.type.trim() ? editForm.type.trim().toLowerCase() : null;
    if (normalizedType && !ALLOWED_MODULE_TYPES.includes(normalizedType)) {
      setEditError(`Type must be one of: ${allowedModuleTypesLabel}.`);
      return;
    }

    const payload = {
      title: editForm.title.trim(),
      type: normalizedType,
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
              ) : (
                <>
                  <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="admin-lessons-search" className="text-xs font-semibold uppercase tracking-wide text-textdark/50">
                        Search
                      </label>
                      <input
                        id="admin-lessons-search"
                        type="search"
                        value={lessonSearch}
                        onChange={(event) => setLessonSearch(event.target.value)}
                        placeholder="Title, module, tag…"
                        className="w-full rounded-md border border-[#D9D9D9] px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="admin-lessons-module" className="text-xs font-semibold uppercase tracking-wide text-textdark/50">
                        Module
                      </label>
                      <select
                        id="admin-lessons-module"
                        value={lessonModuleFilter}
                        onChange={(event) => setLessonModuleFilter(event.target.value)}
                        className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">All modules</option>
                        {lessonModuleOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="admin-lessons-format" className="text-xs font-semibold uppercase tracking-wide text-textdark/50">
                        Format
                      </label>
                      <select
                        id="admin-lessons-format"
                        value={lessonFormatFilter}
                        onChange={(event) => setLessonFormatFilter(event.target.value)}
                        className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">All formats</option>
                        {lessonFormatOptions.map((format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="admin-lessons-enhanced" className="text-xs font-semibold uppercase tracking-wide text-textdark/50">
                        Access
                      </label>
                      <select
                        id="admin-lessons-enhanced"
                        value={lessonEnhancedFilter}
                        onChange={(event) => setLessonEnhancedFilter(event.target.value)}
                        className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">All lessons</option>
                        <option value="enhanced">Enhanced only</option>
                        <option value="standard">Standard access</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="admin-lessons-sort" className="text-xs font-semibold uppercase tracking-wide text-textdark/50">
                        Sort by
                      </label>
                      <select
                        id="admin-lessons-sort"
                        value={lessonSortOrder}
                        onChange={(event) => setLessonSortOrder(event.target.value)}
                        className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {LESSON_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setLessonSearch('');
                          setLessonModuleFilter('all');
                          setLessonFormatFilter('all');
                          setLessonEnhancedFilter('all');
                          setLessonSortOrder('newest');
                        }}
                        className="w-full rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {lessonRows.length === 0 ? (
                    <div className="rounded-md border border-dashed border-primary/30 bg-white/60 p-6 text-sm text-textdark/70">
                      {hasLessonFilters
                        ? 'No lessons match the current filters.'
                        : 'No lessons found yet. Create a lesson to get started.'}
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
                </>
              )}
            </section>
          ) : null}

          {isPresentersView ? (
            <section id="presenters" className="rounded-md bg-white p-6 shadow-sm">
              <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Presenters</h2>
                  <p className="text-sm text-textdark/70">
                    Add and edit presenter names so lessons show the right people.
                  </p>
                </div>
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {presentersLoading ? 'Loading…' : presenterCountLabel}
                </span>
              </header>

              {presentersError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {presentersError}
                </div>
              ) : null}
              {presenterDeleteError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {presenterDeleteError}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
                <form onSubmit={handlePresenterSubmit} className="space-y-4 rounded-md border border-[#E4E2EF] p-4" noValidate>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-primary">
                      {editingPresenterId ? 'Edit presenter' : 'Add presenter'}
                    </h3>
                    <p className="text-sm text-textdark/60">
                      {editingPresenterId
                        ? 'Update the presenter name below and save when you are done.'
                        : 'Create a presenter to make them available in lesson editors.'}
                    </p>
                  </div>

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Name *
                    <input
                      type="text"
                      name="name"
                      value={presenterForm.name}
                      onChange={handlePresenterInputChange}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. Alex Johnson"
                      required
                      disabled={presenterSubmitting}
                      autoComplete="off"
                    />
                  </label>

                  {presenterFormError ? (
                    <p className="text-sm text-red-600">{presenterFormError}</p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    {editingPresenterId ? (
                      <button
                        type="button"
                        onClick={handlePresenterCancelEdit}
                        className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                        disabled={presenterSubmitting}
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={presenterSubmitting}
                      className="inline-flex items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {presenterSubmitting ? 'Saving…' : editingPresenterId ? 'Save changes' : 'Add presenter'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {presentersLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="h-16 w-full animate-pulse rounded-md bg-purplebg/60" />
                      ))}
                    </div>
                  ) : sortedPresenters.length === 0 ? (
                    <div className="rounded-md border border-dashed border-primary/30 bg-white/60 p-6 text-sm text-textdark/70">
                      No presenters yet. Add one using the form to the left.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-md border border-[#E4E2EF]">
                      <table className="min-w-full divide-y divide-[#E4E2EF] text-sm">
                        <thead className="bg-[#F8F7FC] text-xs font-semibold uppercase tracking-wide text-textdark/60">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left">Name</th>
                            <th scope="col" className="px-4 py-3 text-left">Updated</th>
                            <th scope="col" className="px-4 py-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E2EF] bg-white text-textdark/80">
                          {sortedPresenters.map((presenter) => {
                            const isDeleting = presenterDeleteSubmittingId === presenter.id;
                            const updatedLabel = formatDate(presenter?.updatedAt ?? presenter?.createdAt);

                            return (
                              <tr key={presenter.id} className="hover:bg-primary/5">
                                <td className="px-4 py-3">
                                  <span className="font-semibold text-primary">{presenter.name}</span>
                                </td>
                                <td className="px-4 py-3">{updatedLabel}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handlePresenterEdit(presenter)}
                                      className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                                      disabled={isDeleting || presenterSubmitting}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePresenterDelete(presenter.id)}
                                      className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? 'Removing…' : 'Delete'}
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
                </div>
              </div>
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
                            placeholder="e.g. core, bitesize"
                            disabled={createSubmitting}
                          />
                          <span className="mt-1 block text-xs text-textdark/60">Allowed types: {allowedModuleTypesLabel}.</span>
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
                                  {isEditing ? (
                                    <span className="mt-1 block text-xs text-textdark/60">
                                      Allowed types: {allowedModuleTypesLabel}.
                                    </span>
                                  ) : null}
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
