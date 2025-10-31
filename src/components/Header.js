'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';

export default function Header({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);
  const toggleProfile = () => setProfileOpen((prev) => !prev);

  const handleSignOut = () => {
    logout();
    setProfileOpen(false);
    router.replace('/login');
  };

  return (
    <header className="fixed inset-x-0 top-0 h-20 bg-[#331D4C] text-white shadow-sm z-40">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-10 px-6">
        <Link href="/dashboard" className="flex items-center" onClick={closeMobile}>
          <Image
            src="/svgs/rainmaker-logo-full.svg"
            alt="Rainmaker"
            width={231}
            height={32}
            className="hidden md:block"
            priority
          />
          <Image
            src="/svgs/rainmaker-logo-small.svg"
            alt="Rainmaker"
            width={36}
            height={36}
            className="md:hidden"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-10 text-base font-normal md:flex">
          <Link href="/lessons" className="transition hover:text-mint">
            Lessons
          </Link>
          <Link href="/stories" className="transition hover:text-mint">
            Stories
          </Link>
        </nav>

        <div className="relative hidden flex-1 items-center max-w-xs sm:max-w-md md:flex">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Image src="/svgs/search-icon.svg" alt="Search" width={18} height={18} />
          </span>
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-md border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-base font-normal text-white placeholder-white/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/40"
          />
        </div>

        <div className="ml-auto hidden items-center md:flex">
          <div className="relative">
            <button
              type="button"
              onClick={toggleProfile}
              className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-mint/60"
            >
              <Image src="/svgs/profile.svg" alt="Profile" width={50} height={50} />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 mt-3 w-56 rounded-lg border border-white/10 bg-[#2A153F] py-3 shadow-lg">
                <nav className="flex flex-col text-sm">
                  <Link
                    href="/profile"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/favourites"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={() => setProfileOpen(false)}
                  >
                    Favourite Lessons
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={() => setProfileOpen(false)}
                  >
                    Leaderboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-1 px-4 py-2 text-left text-red-200 transition hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </nav>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleMobile}
          className="ml-auto inline-flex items-center justify-center rounded-md border border-white/20 p-2 md:hidden"
          aria-label="Toggle navigation"
        >
          <span className="block h-0.5 w-6 bg-white" />
          <span className="mt-1 block h-0.5 w-6 bg-white" />
          <span className="mt-1 block h-0.5 w-6 bg-white" />
        </button>
      </div>

      {mobileOpen ? (
        <div className="md:hidden">
          <div className="border-t border-white/10 bg-[#2A153F] px-6 pb-6 pt-4 space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Image src="/svgs/search-icon.svg" alt="Search" width={18} height={18} />
              </span>
              <input
                type="search"
                placeholder="Search"
                className="w-full rounded-md border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-base font-normal text-white placeholder-white/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/40"
              />
            </div>
            <nav className="flex flex-col gap-3 text-base font-normal">
              <Link href="/lessons" onClick={closeMobile} className="transition hover:text-mint">
                Lessons
              </Link>
              <Link href="/stories" onClick={closeMobile} className="transition hover:text-mint">
                Stories
              </Link>
              <button
                type="button"
                className="flex items-center gap-3 text-left text-base font-normal text-white"
              >
                <Image src="/svgs/profile.svg" alt="Profile" width={40} height={40} />
                <span>{user?.email ?? 'Profile'}</span>
              </button>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
