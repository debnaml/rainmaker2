'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';

const USERS_SUB_NAV_ITEMS = [
  { label: 'Unassigned Users', href: '/admin/users?view=unassigned' },
  { label: 'All Users', href: '/admin/users?view=all' },
  { label: 'Peer Groups', href: '/admin/peer-groups' },
];

const VALID_VIEWS = new Set(['unassigned', 'all']);
const DEFAULT_VIEW = 'unassigned';
const PAGE_SIZE = 20;

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'enhanced', label: 'Enhanced' },
  { value: 'normal', label: 'Standard' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'enhanced', label: 'Enhanced' },
  { value: 'normal', label: 'Standard' },
];

const ASSIGNMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All assignments' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
];

const STATUS_BADGES = {
  assigned: 'bg-[#E8E1F2] text-[#2F2B3A]',
  unassigned: 'bg-[#FFE8C7] text-[#7C4A03]',
};

const ROLE_BADGES = {
  admin: 'bg-[#E1F4F2] text-[#237781]',
  enhanced: 'bg-[#FFF1F1] text-[#B04325]',
  normal: 'bg-[#F1F5F9] text-[#1F2937]',
};

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

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams?.get('view') ?? null;
  const currentView = VALID_VIEWS.has(viewParam) ? viewParam : DEFAULT_VIEW;
  const isUnassignedView = currentView === 'unassigned';
  const isAllUsersView = currentView === 'all';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [peerGroups, setPeerGroups] = useState([]);
  const [peerGroupsLoading, setPeerGroupsLoading] = useState(false);
  const [peerGroupsError, setPeerGroupsError] = useState(null);
  const [updateUserId, setUpdateUserId] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [openPeerGroupEditorId, setOpenPeerGroupEditorId] = useState(null);
  const [openRoleEditorId, setOpenRoleEditorId] = useState(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;
    if (!viewParam || !VALID_VIEWS.has(viewParam)) {
      router.replace('/admin/users?view=unassigned');
    }
  }, [authLoading, isAdmin, router, viewParam]);

  useEffect(() => {
    setPage(1);
    setUsers([]);
    setTotal(0);
    setError(null);

    if (isUnassignedView) {
      setSearchInput('');
      setSearchValue('');
      setRoleFilter('all');
      setAssignmentFilter('all');
    }
  }, [isUnassignedView]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

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
        setPeerGroups(list);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load peer groups', err);
        setPeerGroupsError(err.message ?? 'Unable to load peer groups.');
      } finally {
        setPeerGroupsLoading(false);
      }
    }

    loadPeerGroups();

    return () => controller.abort();
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    if (!VALID_VIEWS.has(currentView)) return;

    const controller = new AbortController();

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (isUnassignedView) {
          params.set('missingPeerGroup', 'true');
          params.set('pageSize', '100');
        } else {
          params.set('page', String(page));
          params.set('pageSize', String(PAGE_SIZE));
          if (searchValue) params.set('search', searchValue);
          if (roleFilter !== 'all') params.set('role', roleFilter);
          if (assignmentFilter !== 'all') params.set('assignment', assignmentFilter);
        }

        const queryString = params.toString();
        const response = await fetch(`/api/admin/users${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load users.');
        }

        const list = Array.isArray(payload.users) ? payload.users : [];
        setUsers(list);
        const nextTotal = typeof payload.total === 'number' ? payload.total : list.length;
        setTotal(nextTotal);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load admin users', err);
        setError(err.message ?? 'Unable to load users.');
      } finally {
        setLoading(false);
      }
    }

    loadUsers();

    return () => controller.abort();
  }, [
    authLoading,
    isAdmin,
    currentView,
    isUnassignedView,
    searchValue,
    roleFilter,
    assignmentFilter,
    page,
    refreshToken,
  ]);

  const totalPages = useMemo(() => {
    if (isUnassignedView) return 1;
    return total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  }, [isUnassignedView, total]);

  const rangeStart = useMemo(() => {
    if (isUnassignedView) {
      return total === 0 ? 0 : 1;
    }
    if (total === 0) return 0;
    return (page - 1) * PAGE_SIZE + 1;
  }, [isUnassignedView, total, page]);

  const rangeEnd = useMemo(() => {
    if (isUnassignedView) {
      return users.length;
    }
    if (total === 0) return 0;
    return Math.min(total, (page - 1) * PAGE_SIZE + users.length);
  }, [isUnassignedView, users.length, total, page]);

  const canGoPrevious = isAllUsersView && page > 1;
  const canGoNext = isAllUsersView && page < totalPages;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchValue(searchInput.trim());
  };

  const handleSearchReset = () => {
    setSearchInput('');
    setSearchValue('');
    setRoleFilter('all');
    setAssignmentFilter('all');
    setPage(1);
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
    setPage(1);
  };

  const handleAssignmentFilterChange = (event) => {
    setAssignmentFilter(event.target.value);
    setPage(1);
  };

  const handlePeerGroupChange = async (userId, nextValue) => {
    if (!userId) return;

    const normalizedValue = nextValue === '' ? null : nextValue;
    setUpdateError(null);
    setOpenPeerGroupEditorId(null);

    try {
      setUpdateUserId(userId);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerGroupId: normalizedValue }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update user.');
      }

      setRefreshToken((value) => value + 1);
    } catch (err) {
      console.error('Failed to update user peer group', err);
      setUpdateError(err.message ?? 'Unable to update user.');
    } finally {
      setUpdateUserId(null);
    }
  };

  const handleRoleChange = async (userId, nextValue) => {
    if (!userId) return;

    const normalizedValue = typeof nextValue === 'string' ? nextValue.trim() : '';
    if (!normalizedValue) return;

    setUpdateError(null);
    setOpenRoleEditorId(null);

    try {
      setUpdateUserId(userId);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: normalizedValue }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update user.');
      }

      setRefreshToken((value) => value + 1);
    } catch (err) {
      console.error('Failed to update user role', err);
      setUpdateError(err.message ?? 'Unable to update user.');
    } finally {
      setUpdateUserId(null);
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <SubNav items={USERS_SUB_NAV_ITEMS} activePathOverride={`/admin/users?view=${currentView}`} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Admin · Users</h1>
            <p className="text-base text-textdark/80">
              Manage user access, peer group assignments, and review account activity.
            </p>
          </header>

          <section className="flex flex-col gap-6 rounded-md bg-white p-6 shadow-sm">
            {peerGroupsError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{peerGroupsError}</div>
            ) : null}
            {updateError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{updateError}</div>
            ) : null}
            {isAllUsersView ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex flex-col gap-4 lg:flex-row lg:items-end"
                  noValidate
                >
                  <label className="flex flex-1 flex-col text-sm font-medium text-primary">
                    Search
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Name or email"
                      className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Role
                    <select
                      value={roleFilter}
                      onChange={handleRoleFilterChange}
                      className="mt-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {ROLE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col text-sm font-medium text-primary">
                    Assignment
                    <select
                      value={assignmentFilter}
                      onChange={handleAssignmentFilterChange}
                      className="mt-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-textdark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {ASSIGNMENT_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={handleSearchReset}
                      className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-textdark/70">
                  <span>
                    Showing {rangeStart === 0 ? 0 : rangeStart}-{rangeEnd} of {total} users
                  </span>
                  <span>Page {page} of {totalPages}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-textdark/70">
                <span>{total === 1 ? '1 user needs assignment' : `${total} users need assignment`}</span>
                <span>
                  Showing {users.length} of {total} unassigned {total === 1 ? 'user' : 'users'}
                </span>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-textdark/70">Loading users…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-textdark/70">
                {isAllUsersView
                  ? 'No users match the current filters yet.'
                  : 'Great! No users are waiting for peer group assignment.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E6E6E6] text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-textdark/50">
                      <th className="py-3 pr-6 font-medium">User</th>
                      <th className="py-3 pr-6 font-medium">Role</th>
                      <th className="py-3 pr-6 font-medium">Peer group</th>
                      <th className="py-3 pr-6 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F1F1] text-sm">
                    {users.map((item) => {
                      const isAssigned = Boolean(item.peer_group_id);
                      const badgeKey = isAssigned ? 'assigned' : 'unassigned';
                      const badgeClass = STATUS_BADGES[badgeKey];
                      const peerGroupName = item?.peer_groups?.name ?? null;
                      const badgeLabel = isAssigned
                        ? peerGroupName ?? 'Assigned'
                        : 'Needs assignment';
                      const currentValue = item.peer_group_id ?? '';
                      const roleValue = (item.role ?? 'normal').toLowerCase();
                      const roleClass = ROLE_BADGES[roleValue] ?? ROLE_BADGES.normal;

                      return (
                        <tr key={item.id ?? item.email} className="hover:bg-[#F9F7FB]">
                          <td className="whitespace-nowrap py-3 pr-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-primary">{item.display_name ?? 'Unnamed user'}</span>
                              <span className="text-xs text-textdark/60">{item.email}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6">
                            <div className="relative inline-flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setOpenRoleEditorId((value) => (value === item.id ? null : item.id))}
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${roleClass} hover:opacity-80`}
                                disabled={updateUserId === item.id}
                              >
                                {(item.role ?? 'normal').toUpperCase()}
                              </button>
                              {openRoleEditorId === item.id ? (
                                <div className="absolute z-10 mt-[42px] w-40 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                                  <label className="block text-xs font-semibold text-primary">Role</label>
                                  <select
                                    autoFocus
                                    value={roleValue}
                                    onChange={(event) => handleRoleChange(item.id, event.target.value)}
                                    onBlur={() => setOpenRoleEditorId(null)}
                                    disabled={updateUserId === item.id}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  >
                                    {ROLE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6">
                            <div className="relative inline-flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setOpenPeerGroupEditorId((value) => (value === item.id ? null : item.id))}
                                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium transition ${badgeClass} hover:opacity-80`}
                                disabled={peerGroupsLoading || updateUserId === item.id}
                              >
                                {badgeLabel}
                              </button>
                              {openPeerGroupEditorId === item.id ? (
                                <div className="absolute z-10 mt-[42px] w-48 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                                  <label className="block text-xs font-semibold text-primary">Peer group</label>
                                  <select
                                    autoFocus
                                    value={currentValue}
                                    onChange={(event) => handlePeerGroupChange(item.id, event.target.value)}
                                    onBlur={() => setOpenPeerGroupEditorId(null)}
                                    disabled={peerGroupsLoading || updateUserId === item.id}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  >
                                    <option value="">Unassigned</option>
                                    {peerGroups.map((group) => (
                                      <option key={group.id} value={group.id}>
                                        {group.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                              {updateUserId === item.id ? (
                                <span className="text-xs text-textdark/60">Saving…</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6 text-textdark/70">
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {isAllUsersView && totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E6E6] pt-4 text-sm">
                <button
                  type="button"
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={!canGoPrevious}
                  className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Previous
                </button>
                <span className="text-textdark/70">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={!canGoNext}
                  className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
