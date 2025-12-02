'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';
import { ADMIN_SUB_NAV_ITEMS } from '../subNavItems';

function formatDate(value) {
  if (!value) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return 'Unknown';
  }
}

function sortPeerGroups(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export default function AdminPeerGroupsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [peerGroups, setPeerGroups] = useState([]);
  const [peerGroupsLoading, setPeerGroupsLoading] = useState(true);
  const [peerGroupsError, setPeerGroupsError] = useState(null);
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingPeerGroupId, setEditingPeerGroupId] = useState(null);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (loading || !isAdmin) return;

    let active = true;
    const controller = new AbortController();

    async function loadPeerGroups() {
      try {
        setPeerGroupsLoading(true);
        setPeerGroupsError(null);

        const response = await fetch('/api/admin/peer-groups', { signal: controller.signal });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load peer groups.');
        }

        const list = Array.isArray(payload.peerGroups) ? payload.peerGroups : [];
        if (!active) return;
        setPeerGroups(sortPeerGroups(list));
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load peer groups', error);
        if (!active) return;
        setPeerGroupsError(error.message ?? 'Unable to load peer groups.');
      } finally {
        if (!active) return;
        setPeerGroupsLoading(false);
      }
    }

    loadPeerGroups();

    return () => {
      active = false;
      controller.abort();
    };
  }, [loading, isAdmin]);

  const peerGroupCountLabel = useMemo(() => {
    if (peerGroupsLoading) return 'Loading…';
    const count = peerGroups.length;
    if (count === 0) return 'No peer groups yet';
    if (count === 1) return '1 peer group';
    return `${count} peer groups`;
  }, [peerGroupsLoading, peerGroups.length]);

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      const url = editingPeerGroupId ? `/api/admin/peer-groups/${editingPeerGroupId}` : '/api/admin/peer-groups';
      const method = editingPeerGroupId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to save peer group.');
      }

      const savedPeerGroup = payload.peerGroup;
      if (!savedPeerGroup || !savedPeerGroup.id) {
        throw new Error('Unable to save peer group.');
      }

      setPeerGroups((previous) => {
        const withoutEdited = previous.filter((item) => item.id !== savedPeerGroup.id);
        return sortPeerGroups([...withoutEdited, savedPeerGroup]);
      });

      setFormName('');
      setEditingPeerGroupId(null);
    } catch (error) {
      console.error('Failed to save peer group', error);
      setFormError(error.message ?? 'Unable to save peer group.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = (peerGroup) => {
    setFormName(peerGroup.name ?? '');
    setEditingPeerGroupId(peerGroup.id);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setFormName('');
    setEditingPeerGroupId(null);
    setFormError(null);
  };

  const handleDelete = async (peerGroupId) => {
    setDeleteError(null);
    if (!peerGroupId) return;

    const shouldProceed = window.confirm('Delete this peer group? This cannot be undone.');
    if (!shouldProceed) return;

    try {
      setDeleteSubmittingId(peerGroupId);

      const response = await fetch(`/api/admin/peer-groups/${peerGroupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to delete peer group.');
      }

      setPeerGroups((previous) => previous.filter((item) => item.id !== peerGroupId));

      if (editingPeerGroupId === peerGroupId) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Failed to delete peer group', error);
      setDeleteError(error.message ?? 'Unable to delete peer group.');
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <SubNav items={ADMIN_SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Admin · Peer Groups</h1>
            <p className="text-base text-textdark/80">
              Manage peer groups so participants can collaborate in the right cohorts.
            </p>
          </header>

          <section className="rounded-md bg-white p-6 shadow-sm">
            <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">Peer groups</h2>
                <p className="text-sm text-textdark/70">
                  Create groups, update their names, and remove ones you no longer need.
                </p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {peerGroupCountLabel}
              </span>
            </header>

            {peerGroupsError ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{peerGroupsError}</div>
            ) : null}
            {deleteError ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{deleteError}</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
              <form onSubmit={handleFormSubmit} className="space-y-4 rounded-md border border-[#E4E2EF] p-4" noValidate>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-primary">
                    {editingPeerGroupId ? 'Edit peer group' : 'Add peer group'}
                  </h3>
                  <p className="text-sm text-textdark/60">
                    {editingPeerGroupId
                      ? 'Update the peer group name and save when you are ready.'
                      : 'Give the group a clear name so admins can assign members quickly.'}
                  </p>
                </div>

                <label className="flex flex-col text-sm font-medium text-primary">
                  Name *
                  <input
                    type="text"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="e.g. Cohort A"
                    disabled={formSubmitting}
                    required
                    autoComplete="off"
                  />
                </label>

                {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {editingPeerGroupId ? (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                      disabled={formSubmitting}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="inline-flex items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {formSubmitting ? 'Saving…' : editingPeerGroupId ? 'Save changes' : 'Add peer group'}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {peerGroupsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="h-16 w-full animate-pulse rounded-md bg-purplebg/60" />
                    ))}
                  </div>
                ) : peerGroups.length === 0 ? (
                  <div className="rounded-md border border-dashed border-primary/30 bg-white/60 p-6 text-sm text-textdark/70">
                    No peer groups yet. Add one using the form on the left.
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
                        {peerGroups.map((peerGroup) => {
                          const isDeleting = deleteSubmittingId === peerGroup.id;
                          const updatedLabel = formatDate(peerGroup.updatedAt ?? peerGroup.createdAt);

                          return (
                            <tr key={peerGroup.id} className="hover:bg-primary/5">
                              <td className="px-4 py-3">
                                <span className="font-semibold text-primary">{peerGroup.name}</span>
                              </td>
                              <td className="px-4 py-3">{updatedLabel}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(peerGroup)}
                                    className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                                    disabled={isDeleting || formSubmitting}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(peerGroup.id)}
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
        </div>
      </main>
    </div>
  );
}
