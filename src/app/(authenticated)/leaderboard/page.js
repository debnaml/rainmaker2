'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Current Progress', href: '/current-progress' },
];

const MOVEMENT_LABELS = {
  1: { label: '▼', className: 'text-red-500', description: 'Down' },
  0: { label: '•', className: 'text-slate-400', description: 'No change' },
  '-1': { label: '▲', className: 'text-emerald-600', description: 'Up' },
};

function formatPercent(value) {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `${Math.round(safe)}%`;
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState([]);
  const [peerGroup, setPeerGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;

    const controller = new AbortController();

    async function loadLeaderboard() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/leaderboard?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load leaderboard.');
        }

        setEntries(Array.isArray(payload.entries) ? payload.entries : []);
        setPeerGroup(payload.peerGroup ?? null);
        setLastUpdated(payload.lastUpdated ?? null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load leaderboard', err);
        setError(err.message ?? 'Unable to load leaderboard.');
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();

    return () => controller.abort();
  }, [authLoading, user?.id]);

  const leaderboardState = useMemo(() => {
    if (loading) {
      return { status: 'loading' };
    }
    if (error) {
      return { status: 'error', message: error };
    }
    if (!peerGroup) {
      return {
        status: 'no-group',
        message: 'Join a peer group to see the leaderboard and track your standing.',
      };
    }
    if (!entries.length) {
      return {
        status: 'empty',
        message: 'Your peer group has no leaderboard data yet. Check back tomorrow.',
      };
    }
    return { status: 'ready' };
  }, [loading, error, peerGroup, entries.length]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const resolved = new Date(lastUpdated);
    if (Number.isNaN(resolved.valueOf())) return null;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(resolved);
  }, [lastUpdated]);

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-6 py-[30px]">
          <header className="pt-[45px]">
            <h1 className="text-left text-3xl font-semibold text-primary">Peer Group Leaderboard</h1>
            <p className="mt-2 text-base text-textdark/80">
              The leaderboard refreshes every morning to reflect the latest lesson progress across your peer group.
            </p>
          </header>

          {leaderboardState.status === 'loading' ? (
            <section className="space-y-4 rounded-md bg-white p-6 shadow-sm">
              <div className="h-6 w-48 animate-pulse rounded bg-purplebg/70" />
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-14 w-full animate-pulse rounded bg-purplebg/60" />
              ))}
            </section>
          ) : leaderboardState.status === 'error' ? (
            <section className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {leaderboardState.message}
            </section>
          ) : leaderboardState.status === 'no-group' ? (
            <section className="rounded-md bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-primary">No peer group yet</h2>
              <p className="mt-2 text-sm text-textdark/70">{leaderboardState.message}</p>
            </section>
          ) : leaderboardState.status === 'empty' ? (
            <section className="rounded-md bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-primary">Leaderboard coming soon</h2>
              <p className="mt-2 text-sm text-textdark/70">{leaderboardState.message}</p>
            </section>
          ) : (
            <section className="space-y-6 rounded-md bg-white p-6 shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-primary">{peerGroup?.name}</h2>
                  <p className="text-sm text-textdark/70">
                    {lastUpdatedLabel ? `Last updated ${lastUpdatedLabel}` : 'Standings update daily.'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {entries.length} {entries.length === 1 ? 'member' : 'members'}
                </span>
              </header>

              <div className="overflow-hidden rounded-md border border-[#E4E2EF]">
                <table className="min-w-full divide-y divide-[#E4E2EF] text-left text-sm">
                  <thead className="bg-[#F8F7FC] text-xs font-semibold uppercase tracking-wide text-textdark/60">
                    <tr>
                      <th scope="col" className="px-4 py-3">Rank</th>
                      <th scope="col" className="px-4 py-3">Member</th>
                      <th scope="col" className="px-4 py-3">Progress</th>
                      <th scope="col" className="px-4 py-3">Movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E2EF] bg-white text-textdark/80">
                    {entries.map((entry) => {
                      const isCurrentUser = entry.id === user?.id;
                      const movementConfig = MOVEMENT_LABELS[entry.movement] ?? MOVEMENT_LABELS[0];

                      return (
                        <tr
                          key={entry.id}
                          className={isCurrentUser ? 'bg-primary/5 font-semibold text-primary' : 'hover:bg-primary/5'}
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span>{entry.name}</span>
                            {isCurrentUser ? (
                              <span className="ml-2 rounded-full bg-primary/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-primary">You</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-2 w-36 overflow-hidden rounded-full bg-purplebg/70">
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.max(6, Math.min(100, entry.percent))}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{formatPercent(entry.percent)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-base font-semibold ${movementConfig.className}`} aria-label={movementConfig.description}>
                              {movementConfig.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
