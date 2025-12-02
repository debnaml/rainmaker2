'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';
import { ADMIN_SUB_NAV_ITEMS } from '../subNavItems';

const INITIAL_FORM = {
  name: '',
  jobTitle: '',
  yearsExperience: '',
  pastCompanies: '',
  imageUrl: '',
};

export default function AdminLeadersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);

  const imageFileInputRef = useRef(null);
  const formSectionRef = useRef(null);
  const nameInputRef = useRef(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const pageHeading = editingId ? 'Edit leader' : 'Add a leader';
  const submitLabel = editingId ? 'Save changes' : 'Create leader';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const controller = new AbortController();

    async function loadLeaders() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/leaders', { signal: controller.signal });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load leaders.');
        }

        setLeaders(Array.isArray(payload.leaders) ? payload.leaders : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load leaders', err);
        setError(err.message ?? 'Unable to load leaders.');
      } finally {
        setLoading(false);
      }
    }

    loadLeaders();

    return () => controller.abort();
  }, [authLoading, isAdmin]);

  const hasLeaders = useMemo(() => leaders.length > 0, [leaders]);

  if (authLoading || !isAdmin) {
    return null;
  }

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setFormError(null);
    setSubmitting(false);
    setEditingId(null);
    setImageUploading(false);
    setImageUploadError(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleImageUploadClick = () => {
    if (imageFileInputRef.current) {
      imageFileInputRef.current.click();
    }
  };

  const handleClearImage = () => {
    setForm((previous) => ({ ...previous, imageUrl: '' }));
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

      const response = await fetch('/api/admin/uploads/leader-image', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to upload image.');
      }

      const nextUrl = typeof payload.url === 'string' ? payload.url : '';
      setForm((previous) => ({ ...previous, imageUrl: nextUrl }));
    } catch (uploadError) {
      console.error('Failed to upload leader image', uploadError);
      setImageUploadError(uploadError.message ?? 'Unable to upload image.');
    } finally {
      setImageUploading(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (imageUploading) {
      setFormError('Please wait for the photo upload to finish.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name,
      jobTitle: form.jobTitle,
      yearsExperience: form.yearsExperience,
      pastCompanies: form.pastCompanies,
      imageUrl: typeof form.imageUrl === 'string' ? form.imageUrl.trim() : '',
    };

    const endpoint = editingId ? `/api/admin/leaders/${editingId}` : '/api/admin/leaders';
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to save leader.');
      }

      const leaderRecord = result.leader;
      if (leaderRecord) {
        setLeaders((previous) => {
          if (editingId) {
            return previous.map((item) => (item.id === leaderRecord.id ? leaderRecord : item));
          }
          return [leaderRecord, ...previous];
        });
      }

      resetForm();
    } catch (err) {
      console.error('Failed to submit leader form', err);
      setFormError(err.message ?? 'Unable to save leader.');
      setSubmitting(false);
    }
  };

  const handleEdit = (leader) => {
    if (!leader) return;
    setEditingId(leader.id);
    setForm({
      name: leader.name ?? '',
      jobTitle: leader.jobTitle ?? '',
      yearsExperience: leader.yearsExperience != null ? String(leader.yearsExperience) : '',
      pastCompanies: leader.pastCompanies ?? '',
      imageUrl: leader.imageUrl ?? '',
    });
    setFormError(null);
    setImageUploadError(null);
    setImageUploading(false);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
    requestAnimationFrame(() => {
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 200);
    });
  };

  const handleDelete = async (leaderId) => {
    if (!leaderId) return;
    const confirmed = window.confirm('Delete this leader? This action cannot be undone.');
    if (!confirmed) return;

    setDeleteSubmittingId(leaderId);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/leaders/${leaderId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Unable to delete leader.');
      }

      setLeaders((previous) => previous.filter((item) => item.id !== leaderId));
      if (editingId === leaderId) {
        resetForm();
      }
    } catch (err) {
      console.error('Failed to delete leader', err);
      setDeleteError(err.message ?? 'Unable to delete leader.');
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <SubNav items={ADMIN_SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Admin · Leaders</h1>
            <p className="text-base text-textdark/80">
              Add, edit, or remove Rainmaker speakers. These leaders appear on the public leaders page.
            </p>
          </header>

          <section ref={formSectionRef} className="flex flex-col gap-6 rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">{pageHeading}</h2>
                <p className="text-sm text-textdark/70">
                  Provide a headshot URL, role, experience, and previous companies for each leader.
                </p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-textdark/60">Name *</span>
                  <input
                    type="text"
                    name="name"
                    ref={nameInputRef}
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="rounded-md border border-[#D9D9D9] px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-textdark/60">Job title</span>
                  <input
                    type="text"
                    name="jobTitle"
                    value={form.jobTitle}
                    onChange={handleInputChange}
                    className="rounded-md border border-[#D9D9D9] px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-textdark/60">Years of experience</span>
                  <input
                    type="number"
                    name="yearsExperience"
                    min="0"
                    step="1"
                    value={form.yearsExperience}
                    onChange={handleInputChange}
                    className="rounded-md border border-[#D9D9D9] px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-textdark/60">Headshot</span>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="url"
                        name="imageUrl"
                        value={form.imageUrl}
                        onChange={handleInputChange}
                        placeholder="https://example.com/headshot.jpg"
                        className="flex-1 rounded-md border border-[#D9D9D9] px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleImageUploadClick}
                          disabled={imageUploading}
                          className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                        >
                          {imageUploading ? 'Uploading…' : 'Upload photo'}
                        </button>
                        {form.imageUrl ? (
                          <button
                            type="button"
                            onClick={handleClearImage}
                            className="rounded-full border border-[#D9D9D9] px-3 py-2 text-xs font-medium text-textdark transition hover:border-primary/60 hover:text-primary"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    {imageUploadError ? (
                      <p className="text-xs text-red-600">{imageUploadError}</p>
                    ) : null}
                    {form.imageUrl ? (
                      <div className="flex items-center gap-3">
                        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#E6E6E6] bg-[#F1EAFB]">
                          <Image src={form.imageUrl} alt={form.name || 'Leader headshot'} fill sizes="80px" className="object-cover" />
                        </div>
                        <div className="max-w-xs text-xs text-textdark/60">
                          <p className="truncate">{form.imageUrl}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-textdark/60">Past companies</span>
                <textarea
                  name="pastCompanies"
                  value={form.pastCompanies}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="e.g. Birketts, Rainmaker Group, Acme Corp"
                  className="rounded-md border border-[#D9D9D9] px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : submitLabel}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={submitting}
                    className="rounded-full border border-[#D9D9D9] px-4 py-2 text-sm font-medium text-textdark transition hover:border-primary/60 hover:text-primary disabled:opacity-60"
                  >
                    Discard changes
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="flex flex-col gap-6 rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Current leaders</h2>
              {hasLeaders ? (
                <span className="text-sm text-textdark/60">{leaders.length} loaded</span>
              ) : null}
            </div>

            {loading ? (
              <p className="text-sm text-textdark/70">Loading leaders…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : !hasLeaders ? (
              <p className="text-sm text-textdark/70">No leaders captured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E6E6E6] text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-textdark/50">
                      <th className="py-3 pr-6 font-medium">Name</th>
                      <th className="py-3 pr-6 font-medium">Job title</th>
                      <th className="py-3 pr-6 font-medium">Experience</th>
                      <th className="py-3 pr-6 font-medium">Past companies</th>
                      <th className="py-3 pr-6 font-medium">Image</th>
                      <th className="py-3 pr-6 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F1F1] text-sm">
                    {leaders.map((leader) => {
                      const experienceLabel = leader.yearsExperience != null ? `${leader.yearsExperience} yrs` : '—';
                      return (
                        <tr key={leader.id} className="hover:bg-[#F9F7FB]">
                          <td className="whitespace-nowrap py-3 pr-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-primary">{leader.name}</span>
                              <span className="text-xs text-textdark/60">{leader.id}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6 text-textdark/70">{leader.jobTitle ?? '—'}</td>
                          <td className="whitespace-nowrap py-3 pr-6 text-textdark/70">{experienceLabel}</td>
                          <td className="py-3 pr-6 text-textdark/70">
                            {leader.pastCompanies ? (
                              <span className="block max-w-xs whitespace-pre-line leading-relaxed text-textdark/70">
                                {leader.pastCompanies}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6">
                            {leader.imageUrl ? (
                              <a
                                href={leader.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                              >
                                View image
                              </a>
                            ) : (
                              <span className="text-textdark/50">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleEdit(leader)}
                                className="text-sm font-medium text-primary transition hover:text-action"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(leader.id)}
                                disabled={deleteSubmittingId === leader.id}
                                className="text-sm font-medium text-red-500 transition hover:text-red-600 disabled:opacity-60"
                              >
                                {deleteSubmittingId === leader.id ? 'Deleting…' : 'Delete'}
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

            {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
          </section>
        </div>
      </main>
    </div>
  );
}
