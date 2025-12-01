'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import { RESOURCE_TYPES } from '/lib/resources/constants';
import SubNav from '~/components/SubNav';

const CONTENT_SECTION_ITEMS = [
  { key: 'lessons', label: 'Lessons', href: '/admin/content?view=lessons' },
  { key: 'modules', label: 'Modules', href: '/admin/content?view=modules' },
  { key: 'presenters', label: 'Presenters', href: '/admin/content?view=presenters' },
  { key: 'tags', label: 'Tags', href: '/admin/content?view=tags' },
  { key: 'formats', label: 'Formats', href: '/admin/content?view=formats' },
];

function sanitizeSelection(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === 'string' && value.length > 0) : [];
}

const TAG_DATALIST_ID = 'admin-edit-lesson-tags';
const MAX_TAG_COUNT = 25;
const MAX_TAG_LENGTH = 60;

function parseSequenceInput(rawValue) {
  if (rawValue === undefined) {
    return { valid: true, value: null };
  }

  if (rawValue === null) {
    return { valid: true, value: null };
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue)) {
      return { valid: false, value: null };
    }
    return { valid: true, value: rawValue };
  }

  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return { valid: true, value: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { valid: false, value: null };
  }

  return { valid: true, value: parsed };
}

function normalizeTagValue(rawValue) {
  if (typeof rawValue !== 'string') return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_TAG_LENGTH ? trimmed.slice(0, MAX_TAG_LENGTH) : trimmed;
}

function tokenizeTagInput(rawValue) {
  if (typeof rawValue !== 'string') return [];
  return rawValue
    .split(',')
    .map((value) => normalizeTagValue(value))
    .filter(Boolean);
}

function sanitizeTagList(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Map();
  values.forEach((value) => {
    const normalized = normalizeTagValue(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!unique.has(key) && unique.size < MAX_TAG_COUNT) {
      unique.set(key, normalized);
    }
  });
  return Array.from(unique.values());
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [sequence, setSequence] = useState('');
  const [isEnhancedOnly, setIsEnhancedOnly] = useState(false);
  const [selectedPresenterIds, setSelectedPresenterIds] = useState([]);
  const [tagChips, setTagChips] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const tagKeyRef = useRef(0);

  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState(null);
  const [resourceForm, setResourceForm] = useState({ title: '', type: 'file', url: '', sequence: '', file: null });
  const [resourceFormError, setResourceFormError] = useState(null);
  const [resourceSubmitting, setResourceSubmitting] = useState(false);
  const [resourceActionId, setResourceActionId] = useState(null);
  const [resourceEditId, setResourceEditId] = useState(null);
  const [resourceEditForm, setResourceEditForm] = useState({ title: '', type: 'link', url: '', sequence: '', file: null });
  const [resourceEditError, setResourceEditError] = useState(null);
  const resourceFileInputRef = useRef(null);
  const resourceEditFileInputRef = useRef(null);
  const imageFileInputRef = useRef(null);

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
        const tagList = Array.isArray(tagsPayload?.tags) ? sanitizeTagList(tagsPayload.tags) : [];
        setAvailableTags(tagList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
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
    setResourcesLoading(true);
    setResourcesError(null);

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
        setImageUploadError(null);
        if (imageFileInputRef.current) {
          imageFileInputRef.current.value = '';
        }
        setSequence(lesson.sequence !== null && lesson.sequence !== undefined ? String(lesson.sequence) : '');
        setIsEnhancedOnly(Boolean(lesson.is_enhanced_only));
        setSelectedPresenterIds(Array.isArray(lesson.presenterIds) ? lesson.presenterIds.map(String) : []);
        const sanitizedTags = Array.isArray(lesson.tags) ? sanitizeTagList(lesson.tags) : [];
        setResources(Array.isArray(lesson.resources) ? lesson.resources : []);
        let nextKey = 0;
        const chips = sanitizedTags.map((label) => {
          nextKey += 1;
          return { id: `tag-${nextKey}`, label };
        });
        tagKeyRef.current = nextKey;
        setTagChips(chips);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load lesson for editing', error);
        setLessonError(error.message ?? 'Unable to load lesson.');
        setResources([]);
        setResourcesError(error.message ?? 'Unable to load lesson resources.');
      } finally {
        if (isMounted) {
          setLessonLoading(false);
          setResourcesLoading(false);
        }
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
    const candidates = tokenizeTagInput(rawValue);
    if (!candidates.length) {
      setTagInput('');
      return;
    }

    setTagChips((previous) => {
      const prior = Array.isArray(previous) ? previous : [];
      if (prior.length >= MAX_TAG_COUNT) {
        return prior;
      }

      const existing = new Set(prior.map((chip) => chip.label.toLowerCase()));
      const next = [...prior];

      candidates.forEach((label) => {
        if (!label) return;
        const key = label.toLowerCase();
        if (existing.has(key)) return;
        if (next.length >= MAX_TAG_COUNT) return;
        existing.add(key);
        tagKeyRef.current += 1;
        next.push({ id: `tag-${tagKeyRef.current}`, label });
        console.log('[admin/edit lesson] Added tag chip', { label, total: next.length });
      });

      return next;
    });

    setTagInput('');
  };

  const resourceTypeLabelMap = useMemo(() => {
    return new Map(RESOURCE_TYPES.map((entry) => [entry.value, entry.label]));
  }, []);

  const sortResourceList = (items) => {
    return [...items].sort((a, b) => {
      const sequenceA = Number.isFinite(a?.sequence) ? a.sequence : Number.MAX_SAFE_INTEGER;
      const sequenceB = Number.isFinite(b?.sequence) ? b.sequence : Number.MAX_SAFE_INTEGER;
      if (sequenceA !== sequenceB) return sequenceA - sequenceB;
      const titleA = (a?.title ?? '').toLowerCase();
      const titleB = (b?.title ?? '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  };

  const resetResourceForm = () => {
    setResourceForm({ title: '', type: 'file', url: '', sequence: '', file: null });
    setResourceFormError(null);
    if (resourceFileInputRef.current) {
      resourceFileInputRef.current.value = '';
    }
  };

  const handleResourceInputChange = (field, value) => {
    setResourceForm((previous) => ({
      ...previous,
      [field]: field === 'url' || field === 'title' ? (value ?? '') : value,
    }));
  };

  const handleResourceFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setResourceForm((previous) => ({ ...previous, file: nextFile }));
  };

  const handleCreateResource = async (event) => {
    if (event) {
      event.preventDefault();
    }
    if (!lessonId) return;
    if (resourceSubmitting) return;

    const trimmedTitle = resourceForm.title.trim();
    if (!trimmedTitle) {
      setResourceFormError('Title is required.');
      return;
    }

    const sequenceResult = parseSequenceInput(resourceForm.sequence);
    if (!sequenceResult.valid) {
      setResourceFormError('Sequence must be a valid number.');
      return;
    }

    if (resourceForm.type === 'file' && !resourceForm.file) {
      setResourceFormError('Choose a file to upload.');
      return;
    }

    if (resourceForm.type !== 'file') {
      const trimmedUrl = resourceForm.url.trim();
      if (!trimmedUrl) {
        setResourceFormError('Enter a valid URL for this resource.');
        return;
      }
    }

    setResourceSubmitting(true);
    setResourceFormError(null);
    setResourcesError(null);

    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('type', resourceForm.type);
      if (resourceForm.sequence.trim()) {
        formData.append('sequence', resourceForm.sequence.trim());
      }

      if (resourceForm.type === 'file' && resourceForm.file) {
        formData.append('file', resourceForm.file, resourceForm.file.name);
      } else if (resourceForm.type !== 'file') {
        formData.append('externalUrl', resourceForm.url.trim());
      }

      const response = await fetch(`/api/admin/lessons/${lessonId}/resources`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create resource.');
      }

      if (payload?.resource) {
        setResources((previous) => sortResourceList([...(previous ?? []), payload.resource]));
      }

      resetResourceForm();
    } catch (error) {
      console.error('Failed to create resource', error);
      setResourceFormError(error.message ?? 'Unable to create resource.');
    } finally {
      setResourceSubmitting(false);
    }
  };

  const handleResourceFormKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (resourceSubmitting) return;
      handleCreateResource();
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!lessonId || !resourceId) return;
    const confirmed = window.confirm('Remove this resource? This action cannot be undone.');
    if (!confirmed) return;

    setResourceActionId(resourceId);
    setResourceFormError(null);
    setResourcesError(null);

    try {
      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to delete resource.');
      }

      setResources((previous) => (previous ?? []).filter((item) => item.id !== resourceId));
      if (resourceEditId === resourceId) {
        setResourceEditId(null);
        setResourceEditForm({ title: '', type: 'link', url: '', sequence: '', file: null });
        setResourceEditError(null);
      }
    } catch (error) {
      console.error('Failed to delete resource', error);
      setResourcesError(error.message ?? 'Unable to delete resource.');
    } finally {
      setResourceActionId(null);
    }
  };

  const handleBeginEditResource = (resource) => {
    if (!resource) return;
    setResourceEditId(resource.id);
    setResourceEditForm({
      title: resource.title ?? '',
      type: resource.type ?? 'file',
      url: resource.url ?? '',
      sequence: resource.sequence !== null && resource.sequence !== undefined ? String(resource.sequence) : '',
      file: null,
    });
    setResourceEditError(null);
    setResourceActionId(null);
    if (resourceEditFileInputRef.current) {
      resourceEditFileInputRef.current.value = '';
    }
  };

  const handleCancelEditResource = () => {
    setResourceEditId(null);
    setResourceEditForm({ title: '', type: 'link', url: '', sequence: '', file: null });
    setResourceEditError(null);
    if (resourceEditFileInputRef.current) {
      resourceEditFileInputRef.current.value = '';
    }
  };

  const handleEditFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setResourceEditForm((previous) => ({ ...previous, file: nextFile }));
  };

  const handleSaveResource = async () => {
    if (!lessonId || !resourceEditId) return;
    const trimmedTitle = resourceEditForm.title.trim();
    if (!trimmedTitle) {
      setResourceEditError('Title is required.');
      return;
    }

    const sequenceResult = parseSequenceInput(resourceEditForm.sequence);
    if (!sequenceResult.valid) {
      setResourceEditError('Sequence must be a valid number.');
      return;
    }

    if (resourceEditForm.type !== 'file') {
      const trimmedUrl = resourceEditForm.url.trim();
      if (!trimmedUrl) {
        setResourceEditError('Enter a valid URL for this resource.');
        return;
      }
    }

    setResourceSubmitting(true);
    setResourceActionId(resourceEditId);
    setResourceEditError(null);
    setResourcesError(null);

    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('type', resourceEditForm.type);
      formData.append('sequence', resourceEditForm.sequence.trim());

      if (resourceEditForm.type === 'file' && resourceEditForm.file) {
        formData.append('file', resourceEditForm.file, resourceEditForm.file.name);
      }

      if (resourceEditForm.type !== 'file') {
        formData.append('externalUrl', resourceEditForm.url.trim());
      }

      const response = await fetch(`/api/admin/resources/${resourceEditId}`, {
        method: 'PATCH',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update resource.');
      }

      if (payload?.resource) {
        setResources((previous) =>
          sortResourceList((previous ?? []).map((item) => (item.id === resourceEditId ? payload.resource : item)))
        );
      }

      handleCancelEditResource();
    } catch (error) {
      console.error('Failed to update resource', error);
      setResourceEditError(error.message ?? 'Unable to update resource.');
    } finally {
      setResourceSubmitting(false);
      setResourceActionId(null);
    }
  };

  const handleTagKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ',') && !event.shiftKey) {
      event.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleRemoveTag = (chipId, expectedLabel) => {
    setTagChips((previous) => {
      const prior = Array.isArray(previous) ? previous : [];
      if (!prior.length) {
        console.info('[admin/edit lesson] Ignored tag removal because no chips are present', { chipId });
        return prior;
      }

      const targetIndex = prior.findIndex((chip) => chip.id === chipId);
      if (targetIndex === -1) {
        console.warn('[admin/edit lesson] Failed to remove tag chip because it was not found', {
          chipId,
          chipIds: prior.map((chip) => chip.id),
        });
        return prior;
      }

      const target = prior[targetIndex];
      if (expectedLabel && target.label !== expectedLabel) {
        console.error('[admin/edit lesson] Refused to remove tag chip because the label mismatched the id', {
          chipId,
          expectedLabel,
          actualLabel: target.label,
        });
        return prior;
      }

      const next = [...prior.slice(0, targetIndex), ...prior.slice(targetIndex + 1)];
      console.log('[admin/edit lesson] Removed tag chip', {
        chipId,
        label: target.label,
        remaining: next.length,
        before: prior.map((chip) => chip.label),
        after: next.map((chip) => chip.label),
      });
      return next;
    });
  };

  const handleClearImage = () => {
    setImageUrl('');
    setImageUploadError(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  const handleImageFileChange = async (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;

    setImageUploadError(null);
    setImageUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', nextFile);

      const response = await fetch('/api/admin/uploads/lesson-image', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to upload image.');
      }

      setImageUrl(payload.url ?? '');
    } catch (error) {
      console.error('Failed to upload lesson image', error);
      setImageUploadError(error.message ?? 'Unable to upload image.');
    } finally {
      setImageUploading(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
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
      const parsedSequence = parseSequenceInput(sequence);
      if (!parsedSequence.valid) {
        throw new Error('Sequence must be a valid number.');
      }

      const payload = {
        title: title.trim(),
        moduleId: moduleId || null,
        format: format || null,
        duration: duration || null,
        externalUrl: externalUrl || null,
        imageUrl: imageUrl || null,
        sequence: parsedSequence.value,
        isEnhancedOnly,
        presenterIds: sanitizeSelection(selectedPresenterIds),
        tags: sanitizeTagList(tagChips.map((chip) => chip.label)),
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

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Sequence
                    <input
                      type="number"
                      value={sequence}
                      onChange={(event) => setSequence(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. 1"
                      disabled={submitting}
                      inputMode="numeric"
                    />
                    <span className="mt-1 text-xs font-normal text-textdark/60">
                      Controls lesson order within its module. Leave blank to keep existing placement.
                    </span>
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

                  <div className="flex flex-col text-sm font-medium text-primary md:col-span-2">
                    <label htmlFor="admin-edit-lesson-image-url" className="text-sm font-medium text-primary">
                      Featured image
                    </label>
                    <input
                      id="admin-edit-lesson-image-url"
                      type="url"
                      value={imageUrl}
                      onChange={(event) => {
                        setImageUrl(event.target.value);
                        if (imageUploadError) {
                          setImageUploadError(null);
                        }
                      }}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://"
                      disabled={submitting}
                    />
                    <div className="mt-2 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <label htmlFor="admin-edit-lesson-image-upload" className="text-xs font-semibold uppercase tracking-wide text-textdark/60">
                          Upload image
                        </label>
                        <input
                          id="admin-edit-lesson-image-upload"
                          ref={imageFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          disabled={submitting || imageUploading}
                          className="text-xs text-textdark"
                        />
                        <button
                          type="button"
                          onClick={handleClearImage}
                          disabled={submitting || imageUploading || !imageUrl}
                          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear image
                        </button>
                      </div>
                      <p className="text-xs font-normal text-textdark/60">
                        Upload a new image (5MB max). The file is stored and the public link is inserted above.
                      </p>
                      {imageUploading ? (
                        <p className="text-xs text-textdark/60">Uploading image…</p>
                      ) : null}
                      {imageUploadError ? (
                        <p className="text-xs text-red-600">{imageUploadError}</p>
                      ) : null}
                      {imageUrl ? (
                        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                          <Image
                            src={imageUrl}
                            alt="Lesson preview"
                            width={640}
                            height={256}
                            className="h-32 w-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                        {tagChips.length > 0 ? (
                          tagChips.map((chip) => (
                            <span
                              key={chip.id}
                              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                            >
                              {chip.label}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(chip.id, chip.label)}
                                className="text-primary/70 transition hover:text-primary"
                                aria-label={`Remove tag ${chip.label}`}
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

                <section className="space-y-4 rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Resources</h3>
                      <p className="text-xs text-textdark/60">
                        Upload supporting files or link to external material for this lesson.
                      </p>
                    </div>
                  </div>

                  {resourcesError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">{resourcesError}</div>
                  ) : null}

                  {resourceFormError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">{resourceFormError}</div>
                  ) : null}

                  {resourcesLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="h-14 w-full animate-pulse rounded-md bg-purplebg/50" />
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-textdark/60">
                      No resources added yet.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {resources.map((resource) => {
                        const typeLabel = resourceTypeLabelMap.get(resource.type) ?? resource.type;
                        const isEditing = resourceEditId === resource.id;
                        const isBusy = resourceActionId === resource.id && resourceSubmitting;

                        return (
                          <li key={resource.id} className="rounded-md border border-slate-200 bg-white p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-primary break-words">{resource.title}</span>
                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    {typeLabel}
                                  </span>
                                  {resource.sequence !== null && resource.sequence !== undefined ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-textdark/60">
                                      Seq {resource.sequence}
                                    </span>
                                  ) : null}
                                </div>
                                {resource.type !== 'file' && resource.url ? (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-action"
                                  >
                                    {resource.url}
                                    <span aria-hidden="true">↗</span>
                                  </a>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleSaveResource}
                                      disabled={resourceSubmitting}
                                      className="inline-flex items-center justify-center rounded-full bg-action px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {resourceSubmitting && resourceActionId === resource.id ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditResource}
                                      disabled={resourceSubmitting}
                                      className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleBeginEditResource(resource)}
                                      className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                                      disabled={resourceSubmitting}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteResource(resource.id)}
                                      className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                                      disabled={isBusy}
                                    >
                                      {isBusy ? 'Removing…' : 'Remove'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                                {resourceEditError ? (
                                  <div className="rounded-md border border-red-200 bg-red-100 p-2 text-xs text-red-700">
                                    {resourceEditError}
                                  </div>
                                ) : null}
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="flex flex-col text-xs font-semibold text-primary">
                                    Title
                                    <input
                                      type="text"
                                      value={resourceEditForm.title}
                                      onChange={(event) =>
                                        setResourceEditForm((previous) => ({
                                          ...previous,
                                          title: event.target.value ?? '',
                                        }))
                                      }
                                      disabled={resourceSubmitting}
                                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                  </label>
                                  <label className="flex flex-col text-xs font-semibold text-primary">
                                    Sequence
                                    <input
                                      type="number"
                                      value={resourceEditForm.sequence}
                                      onChange={(event) =>
                                        setResourceEditForm((previous) => ({
                                          ...previous,
                                          sequence: event.target.value,
                                        }))
                                      }
                                      disabled={resourceSubmitting}
                                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                  </label>
                                  <label className="flex flex-col text-xs font-semibold text-primary">
                                    Type
                                    <select
                                      value={resourceEditForm.type}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setResourceEditForm((previous) => ({
                                          ...previous,
                                          type: value,
                                          url: value === 'file' ? '' : (typeof previous.url === 'string' ? previous.url : ''),
                                          file: null,
                                        }));
                                        if (resourceEditFileInputRef.current) {
                                          resourceEditFileInputRef.current.value = '';
                                        }
                                      }}
                                      disabled={resourceSubmitting}
                                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    >
                                      {RESOURCE_TYPES.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  {resourceEditForm.type === 'file' ? (
                                    <label key="resource-edit-file" className="flex flex-col text-xs font-semibold text-primary">
                                      Replace file
                                      <input
                                        key="resource-edit-file-input"
                                        type="file"
                                        onChange={handleEditFileChange}
                                        ref={resourceEditFileInputRef}
                                        disabled={resourceSubmitting}
                                        className="mt-1 w-full text-sm text-textdark"
                                      />
                                      <span className="mt-1 text-[11px] font-normal text-textdark/60">Optional. Max 50MB.</span>
                                    </label>
                                  ) : (
                                    <label key="resource-edit-url" className="flex flex-col text-xs font-semibold text-primary md:col-span-2">
                                      Resource URL
                                      <input
                                        key="resource-edit-url-input"
                                        type="url"
                                        value={resourceEditForm.url ?? ''}
                                        onChange={(event) =>
                                          setResourceEditForm((previous) => ({
                                            ...previous,
                                            url: event.target.value ?? '',
                                          }))
                                        }
                                        disabled={resourceSubmitting}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        placeholder="https://"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div
                    className="space-y-3 rounded-md border border-dashed border-slate-200 bg-slate-50 p-4"
                    role="group"
                    onKeyDown={handleResourceFormKeyDown}
                  >
                    <h4 className="text-sm font-semibold text-primary">Add resource</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col text-xs font-semibold text-primary">
                        Title *
                        <input
                          type="text"
                          value={resourceForm.title}
                          onChange={(event) => handleResourceInputChange('title', event.target.value)}
                          disabled={resourceSubmitting}
                          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="e.g. Participant workbook"
                        />
                      </label>
                      <label className="flex flex-col text-xs font-semibold text-primary">
                        Sequence
                        <input
                          type="number"
                          value={resourceForm.sequence}
                          onChange={(event) => handleResourceInputChange('sequence', event.target.value)}
                          disabled={resourceSubmitting}
                          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Optional order"
                        />
                      </label>
                      <label className="flex flex-col text-xs font-semibold text-primary">
                        Type
                        <select
                          value={resourceForm.type}
                          onChange={(event) => {
                            const value = event.target.value;
                            setResourceForm((previous) => ({
                              ...previous,
                              type: value,
                              url: value === 'file' ? '' : (typeof previous.url === 'string' ? previous.url : ''),
                              file: null,
                            }));
                            if (resourceFileInputRef.current) {
                              resourceFileInputRef.current.value = '';
                            }
                          }}
                          disabled={resourceSubmitting}
                          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {RESOURCE_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {resourceForm.type === 'file' ? (
                        <label key="resource-create-file" className="flex flex-col text-xs font-semibold text-primary">
                          Upload file *
                          <input
                            key="resource-create-file-input"
                            type="file"
                            onChange={handleResourceFileChange}
                            ref={resourceFileInputRef}
                            disabled={resourceSubmitting}
                            className="mt-1 w-full text-sm text-textdark"
                          />
                          <span className="mt-1 text-[11px] font-normal text-textdark/60">Max 50MB. PDF, PPT, DOC, XLS supported.</span>
                        </label>
                      ) : (
                        <label key="resource-create-url" className="flex flex-col text-xs font-semibold text-primary md:col-span-2">
                          Resource URL *
                          <input
                            key="resource-create-url-input"
                            type="url"
                            value={resourceForm.url ?? ''}
                            onChange={(event) => handleResourceInputChange('url', event.target.value)}
                            disabled={resourceSubmitting}
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="https://"
                          />
                        </label>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={handleCreateResource}
                        disabled={resourceSubmitting}
                        className="inline-flex items-center justify-center rounded-full bg-action px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {resourceSubmitting ? 'Uploading…' : 'Add resource'}
                      </button>
                    </div>
                  </div>
                </section>

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
