'use client';

import { useAuth } from '/lib/authContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="flex flex-col">
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-[30px]">
          <h1 className="mb-[30px] pt-[45px] text-left text-3xl font-semibold text-primary">Profile</h1>
          <p className="text-base text-textdark/80">
            {`Hi ${firstName}, your profile tools will live here soon. We'll add settings, personal details, and notification preferences in this space.`}
          </p>
        </div>
      </main>
    </div>
  );
}
