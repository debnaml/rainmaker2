'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';

const CONTENT_SECTION_ITEMS = [
  { key: 'lessons', label: 'Lessons', href: '/admin/content?view=lessons' },
  { key: 'modules', label: 'Modules', href: '/admin/content?view=modules' },
  { key: 'presenters', label: 'Presenters', href: '/admin/content?view=presenters' },
  { key: 'tags', label: 'Tags', href: '/admin/content?view=tags' },
  { key: 'formats', label: 'Formats', href: '/admin/content?view=formats' },
];

const TAG_DATALIST_ID = 'admin-lesson-tags';

function sanitizeSelection(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === 'string' && value.length > 0) : [];
}

function sanitizeTags(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Map();
  values.forEach((value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, trimmed.slice(0, 60));
    }
  });
  return Array.from(seen.values()).slice(0, 25);
}

function extractTagCandidates(input) {
  if (typeof input !== 'string' || !input.trim()) return [];
  return input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export default function EditLessonPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.lessonId ?? null;
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [modules, setModules] = useState([]);
  const [presenters, setPresenters] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState(null);

  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [format, setFormat] = useState('');
  const [duration, setDuration] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isEnhancedOnly, setIsEnhancedOnly] = useState(false);
  const [selectedPresenterIds, setSelectedPresenterIds] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;

    let isMounted = true;
    setOptionsLoading(true);
    setOptionsError(null);

    async function fetchOptions() {
      try {
        const [modulesResponse, presentersResponse, tagsResponse] = await Promise.all([
          fetch('/api/admin/modules'),
          fetch('/api/admin/presenters'),
          fetch('/api/admin/tags'),
        ]);

        const [modulesPayload, presentersPayload] = await Promise.all([
          modulesResponse.json(),
          presentersResponse.json(),
        ]);

        let tagsPayload = { tags: [] };
        try {
          tagsPayload = await tagsResponse.json();
        } catch (parseError) {
          console.warn('[admin/edit lesson] Failed to parse tags payload', parseError);
        }

        if (!modulesResponse.ok) {
          throw new Error(modulesPayload.error ?? 'Unable to load modules.');
        }

        if (!presentersResponse.ok) {
          throw new Error(presentersPayload.error ?? 'Unable to load presenters.');
        }

        if (!tagsResponse.ok) {
          console.warn('[admin/edit lesson] Unable to load tags', tagsPayload?.error ?? 'Unknown error');
        }

        if (!isMounted) return;
        setModules(Array.isArray(modulesPayload.modules) ? modulesPayload.modules : []);
        setPresenters(Array.isArray(presentersPayload.presenters) ? presentersPayload.presenters : []);
        const tagList = Array.isArray(tagsPayload?.tags) ? tagsPayload.tags : [];
        const sanitizedTagOptions = sanitizeTags(tagList).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        setAvailableTags(sanitizedTagOptions);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load edit lesson options', error);
        setOptionsError(error.message ?? 'Unable to load lesson options.');
      } finally {
        if (isMounted) setOptionsLoading(false);
      }
    }

    fetchOptions();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, loading]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    if (!lessonId) return;

    let isMounted = true;
    setLessonLoading(true);
    setLessonError(null);

    async function fetchLesson() {
      try {
        const response = await fetch(`/api/admin/lessons/${lessonId}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load lesson.');
        }

        if (!isMounted) return;

        const lesson = payload?.lesson ?? null;
        if (!lesson) {
          throw new Error('Lesson not found.');
        }

        setTitle(lesson.title ?? '');
        setModuleId(lesson.module_id ?? '');
        setFormat(lesson.format ?? '');
        setDuration(lesson.duration ?? '');
        setExternalUrl(lesson.url ?? '');
        setImageUrl(lesson.image_url ?? '');
        setIsEnhancedOnly(Boolean(lesson.is_enhanced_only));
        setSelectedPresenterIds(Array.isArray(lesson.presenterIds) ? lesson.presenterIds.map(String) : []);
        setSelectedTags(Array.isArray(lesson.tags) ? sanitizeTags(lesson.tags) : []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load lesson for editing', error);
        setLessonError(error.message ?? 'Unable to load lesson.');
      } finally {
        if (isMounted) setLessonLoading(false);
      }
    }

    fetchLesson();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, lessonId, loading]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    window.scrollTo(0, 0);
  }, [isAdmin, loading]);

  const presenterOptions = useMemo(() => presenters, [presenters]);

  const handleAddTag = (rawValue) => {
    const candidates = extractTagCandidates(rawValue);
    if (!candidates.length) {
      setTagInput('');
      return;
    }
    const next = sanitizeTags([...selectedTags, ...candidates]);
    setSelectedTags(next);
    setTagInput('');
  };

  const handleTagKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ',') && !event.shiftKey) {
      event.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setSelectedTags((previous) => previous.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!lessonId) return;
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: title.trim(),
        moduleId: moduleId || null,
        format: format || null,
        duration: duration || null,
        externalUrl: externalUrl || null,
        imageUrl: imageUrl || null,
        isEnhancedOnly,
        presenterIds: sanitizeSelection(selectedPresenterIds),
        tags: sanitizeTags(selectedTags),
      };

      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.error ?? 'Unable to update lesson.');
      }

      router.replace('/admin/content?view=lessons');
      router.refresh();
    } catch (error) {
      console.error('Failed to update lesson', error);
      setFormError(error.message ?? 'Unable to update lesson.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAdmin) {
    return null;
  }

  const activeHref = '/admin/content?view=lessons';

  return (
    <div className="flex flex-col">
      <SubNav items={CONTENT_SECTION_ITEMS} activePathOverride={activeHref} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-[30px]">
          <div className="flex items-center justify-between pt-[45px]">
            <div>
              <h1 className="text-left text-3xl font-semibold text-primary">Edit lesson</h1>
              <p className="mt-2 text-sm text-textdark/70">
                Update lesson details and presenter assignments. Changes apply immediately after saving.
              </p>
            </div>
            <Link
              href="/admin/content?view=lessons"
              className="hidden rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white sm:inline-flex"
            >
              Cancel
            </Link>
          </div>

          <section className="rounded-md bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-primary">Lesson details</h2>
              <p className="text-sm text-textdark/60">Fields marked with * are required.</p>
            </div>

            {optionsError ? (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">{optionsError}</div>
            ) : null}

            {lessonError ? (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">{lessonError}</div>
            ) : null}

            {formError ? (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">{formError}</div>
            ) : null}

            {lessonLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="h-12 w-full animate-pulse rounded-md bg-purplebg/60" />
                ))}
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col text-sm font-medium text-primary">
                    Title *
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. Running an effective sales call"
                      required
                      disabled={submitting}
                    />
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Module
                    <select
                      value={moduleId}
                      onChange={(event) => setModuleId(event.target.value)}
                      disabled={optionsLoading || submitting}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Unassigned</option>
                      {modules.map((module) => {
                        const label = module.type ? `${module.title} (${module.type})` : module.title;
                        return (
                          <option key={module.id} value={module.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Format
                    <input
                      type="text"
                      value={format}
                      onChange={(event) => setFormat(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. Video, Podcast, Worksheet"
                      disabled={submitting}
                    />
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Duration
                    <input
                      type="text"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. 18 min"
                      disabled={submitting}
                    />
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary md:col-span-2">
                    External URL
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(event) => setExternalUrl(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://"
                      disabled={submitting}
                    />
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary md:col-span-2">
                    Image URL
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://"
                      disabled={submitting}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-4 rounded-md border border-slate-200 p-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-primary">
                    <input
                      type="checkbox"
                      checked={isEnhancedOnly}
                      onChange={(event) => setIsEnhancedOnly(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      disabled={submitting}
                    />
                    Mark as Enhanced only content
                  </label>
                  <p className="text-xs text-textdark/60">
                    Enhanced-only lessons appear exclusively for members with Enhanced access.
                  </p>
                </div>

                <div>
                  <label className="flex flex-col text-sm font-medium text-primary">
                    Presenters
                    <select
                      multiple
                      value={selectedPresenterIds}
                      onChange={(event) => {
                        const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                        setSelectedPresenterIds(values);
                      }}
                      disabled={optionsLoading || submitting}
                      className="mt-1 h-40 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {presenterOptions.map((presenter) => (
                        <option key={presenter.id} value={String(presenter.id)}>
                          {presenter.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-2 text-xs text-textdark/60">
                    Hold Cmd ⌘ (Mac) or Ctrl (Windows) to select multiple presenters.
                  </p>
                </div>

                <div>
                  <label className="flex flex-col text-sm font-medium text-primary">
                    Tags
                    <div className="mt-1 flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
                        {selectedTags.length > 0 ? (
                          selectedTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="text-primary/70 transition hover:text-primary"
                                aria-label={`Remove tag ${tag}`}
                                disabled={submitting}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-textdark/50">No tags added yet.</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          list={TAG_DATALIST_ID}
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={handleTagKeyDown}
                          onBlur={() => handleAddTag(tagInput)}
                          disabled={submitting}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Type a tag and press Enter"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTag(tagInput)}
                          disabled={submitting || !tagInput.trim()}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Add tag
                        </button>
                      </div>
                    </div>
                  </label>
                  <datalist id={TAG_DATALIST_ID}>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <p className="mt-2 text-xs text-textdark/60">Press Enter or comma to add a tag. Up to 25 tags.</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href="/admin/content?view=lessons"
                    className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting || optionsLoading || lessonLoading}
                    className="inline-flex items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
