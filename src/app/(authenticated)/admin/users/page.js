'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';
import { ADMIN_SUB_NAV_ITEMS } from '../subNavItems';

const FILTERS = [
  { value: 'unassigned', label: 'Needs peer group' },
  { value: 'all', label: 'All users' },
];

const STATUS_BADGES = {
  assigned: 'bg-[#E8E1F2] text-[#2F2B3A]',
  unassigned: 'bg-[#FFE8C7] text-[#7C4A03]',
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
  const [filter, setFilter] = useState('unassigned');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const controller = new AbortController();

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);
        const params = filter === 'unassigned' ? '?missingPeerGroup=true' : '';
        const response = await fetch(`/api/admin/users${params}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load users.');
        }
        setUsers(Array.isArray(payload.users) ? payload.users : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load admin users', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();

    return () => controller.abort();
  }, [authLoading, isAdmin, filter]);

  const counts = useMemo(() => {
    const total = users.length;
    const needsAssignment = users.filter((item) => !item.peer_group_id).length;
    return { total, needsAssignment };
  }, [users]);

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <SubNav items={ADMIN_SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Admin · Users</h1>
            <p className="text-base text-textdark/80">
              Review recently signed-in users and assign them to peer groups.
            </p>
          </header>

          <section className="flex flex-col gap-6 rounded-md bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                {FILTERS.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-[#D9D9D9] bg-white text-textdark hover:border-primary/60 hover:text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-textdark/70">
                <span className="rounded-full bg-[#FFE8C7] px-3 py-1 text-xs font-medium text-[#7C4A03]">
                  Needs assignment: {counts.needsAssignment}
                </span>
                <span className="rounded-full bg-[#E8E1F2] px-3 py-1 text-xs font-medium text-[#2F2B3A]">
                  Total loaded: {counts.total}
                </span>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-textdark/70">Loading users…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-textdark/70">No users match this filter yet.</p>
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
                      return (
                        <tr key={item.id ?? item.email} className="hover:bg-[#F9F7FB]">
                          <td className="whitespace-nowrap py-3 pr-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-primary">{item.display_name ?? 'Unnamed user'}</span>
                              <span className="text-xs text-textdark/60">{item.email}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6">
                            <span className="rounded-full bg-[#E1F4F2] px-3 py-1 text-xs font-medium text-[#237781]">
                              {item.role ?? 'normal'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-6">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                              {isAssigned ? 'Assigned' : 'Needs assignment'}
                            </span>
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
          </section>
        </div>
      </main>
    </div>
  );
}
