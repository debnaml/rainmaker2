'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';
import { ADMIN_SUB_NAV_ITEMS } from '../subNavItems';

export default function AdminContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <SubNav items={ADMIN_SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="pt-[45px] text-left text-3xl font-semibold text-primary">Admin · Content</h1>
            <p className="text-base text-textdark/80">
              Plan and publish Rainmaker lessons, bitesize refreshers, and stories. Build tools landing here soon.
            </p>
          </header>
          <section className="rounded-md bg-white p-6 shadow-sm text-sm text-textdark/70">
            <p>
              Content management screens are in development. Use this space to outline workflows for approving,
              scheduling, and tagging content across the platform.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
