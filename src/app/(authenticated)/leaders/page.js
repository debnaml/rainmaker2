'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

function extractSurname(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function sortLeadersBySurname(list) {
  return [...list].sort((a, b) => {
    const surnameA = extractSurname(a?.name);
    const surnameB = extractSurname(b?.name);
    if (surnameA && surnameB && surnameA !== surnameB) return surnameA.localeCompare(surnameB);
    const nameA = (a?.name ?? '').trim().toLowerCase();
    const nameB = (b?.name ?? '').trim().toLowerCase();
    if (nameA && nameB) return nameA.localeCompare(nameB);
    if (!nameA && nameB) return 1;
    if (nameA && !nameB) return -1;
    return 0;
  });
}

function LeaderCard({ leader }) {
  const { name, jobTitle, yearsExperience, pastCompanies, imageUrl } = leader;
  const experienceLabel = yearsExperience != null ? `${yearsExperience} year${yearsExperience === 1 ? '' : 's'} experience` : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[#E6E6E6] bg-white shadow-sm">
      <div className="relative h-60 w-full bg-[#F1EAFB]">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E9D8FD] to-[#C4AAF4] text-lg font-semibold text-primary">
            {name?.slice(0, 1) ?? '?'}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-primary">{name}</h2>
          {jobTitle ? <p className="text-sm text-textdark/70">{jobTitle}</p> : null}
          {experienceLabel ? <p className="text-xs uppercase tracking-wide text-textdark/50">{experienceLabel}</p> : null}
        </header>
        {pastCompanies ? (
          <div className="rounded-md bg-[#F9F7FB] px-4 py-3 text-sm text-textdark/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-textdark/60">Past companies</p>
            <p className="mt-1 whitespace-pre-line leading-relaxed">{pastCompanies}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function LeadersPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeaders() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/leaders', { signal: controller.signal });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load leaders.');
        }

        const leaderList = Array.isArray(payload.leaders) ? payload.leaders : [];
        setLeaders(sortLeadersBySurname(leaderList));
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
  }, []);

  return (
    <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
      <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
        <header className="space-y-2">
          <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Faculty</h1>
          <p className="text-base text-textdark/80">
            Meet the faculty who bring Rainmaker to life. Learn more about their experience and the organisations they have supported.
          </p>
        </header>

        <section className="mt-8">
          {loading ? (
            <p className="text-sm text-textdark/70">Loading faculty…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : leaders.length === 0 ? (
            <p className="text-sm text-textdark/70">No faculty have been added yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => (
                <LeaderCard key={leader.id ?? leader.name} leader={leader} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
