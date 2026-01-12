'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';

export default function Header({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const showSearch = false;

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev);
    setProfileOpen(false);
    setLessonsOpen(false);
    setAdminOpen(false);
  };
  const closeMobile = () => {
    setMobileOpen(false);
    setProfileOpen(false);
    setLessonsOpen(false);
    setAdminOpen(false);
  };
  const toggleProfile = () => {
    setProfileOpen((prev) => !prev);
    setLessonsOpen(false);
    setAdminOpen(false);
  };
  const toggleLessons = () => {
    setLessonsOpen((prev) => !prev);
    setProfileOpen(false);
    setAdminOpen(false);
  };
  const closeLessons = () => setLessonsOpen(false);
  const toggleAdmin = () => {
    setAdminOpen((prev) => !prev);
    setLessonsOpen(false);
    setProfileOpen(false);
  };
  const closeAdmin = () => setAdminOpen(false);

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
          <div className="relative">
            <button
              type="button"
              onClick={toggleLessons}
              className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition hover:text-mint"
              aria-haspopup="true"
              aria-expanded={lessonsOpen}
            >
              Lessons
              <span
                className={`inline-block h-2.5 w-2.5 -translate-y-[3px] border-b-2 border-r-2 border-current transition-transform ${
                  lessonsOpen ? 'rotate-[225deg]' : 'rotate-45'
                }`}
              />
            </button>
            {lessonsOpen ? (
              <div className="absolute left-0 mt-3 w-56 rounded-lg border border-white/10 bg-[#2A153F] py-3 shadow-lg">
                <nav className="flex flex-col text-sm">
                  <Link
                    href="/lessons"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={closeLessons}
                  >
                    All Lessons
                  </Link>
                  <Link
                    href="/lessons/core"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={closeLessons}
                  >
                    Core Lessons
                  </Link>
                  <Link
                    href="/lessons/bitesize"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={closeLessons}
                  >
                    Bitesize Lessons
                  </Link>
                  <Link
                    href="/lessons/favourites"
                    className="px-4 py-2 transition hover:bg-white/10"
                    onClick={closeLessons}
                  >
                    Favourite Lessons
                  </Link>
                </nav>
              </div>
            ) : null}
          </div>
          <Link href="/stories" className="transition hover:text-mint">
            Stories
          </Link>
          <Link href="/leaders" className="transition hover:text-mint">
            Faculty
          </Link>
          {isAdmin ? (
            <div className="relative">
              <button
                type="button"
                onClick={toggleAdmin}
                className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition hover:text-mint"
                aria-haspopup="true"
                aria-expanded={adminOpen}
              >
                Admin
                <span
                  className={`inline-block h-2.5 w-2.5 -translate-y-[3px] border-b-2 border-r-2 border-current transition-transform ${
                    adminOpen ? 'rotate-[225deg]' : 'rotate-45'
                  }`}
                />
              </button>
              {adminOpen ? (
                <div className="absolute left-0 mt-3 w-56 rounded-lg border border-white/10 bg-[#2A153F] py-3 shadow-lg">
                  <nav className="flex flex-col text-sm">
                    <Link
                      href="/admin/users"
                      className="px-4 py-2 transition hover:bg-white/10"
                      onClick={closeAdmin}
                    >
                      Users
                    </Link>
                    <Link
                      href="/admin/peer-groups"
                      className="px-4 py-2 transition hover:bg-white/10"
                      onClick={closeAdmin}
                    >
                      Peer Groups
                    </Link>
                    <Link
                      href="/admin/content"
                      className="px-4 py-2 transition hover:bg-white/10"
                      onClick={closeAdmin}
                    >
                      Content
                    </Link>
                    <Link
                      href="/admin/leaders"
                      className="px-4 py-2 transition hover:bg-white/10"
                      onClick={closeAdmin}
                    >
                      Faculty
                    </Link>
                    <Link
                      href="/admin/reports"
                      className="px-4 py-2 transition hover:bg-white/10"
                      onClick={closeAdmin}
                    >
                      Reports
                    </Link>
                  </nav>
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>

        {showSearch ? (
          <div className="relative hidden flex-1 items-center max-w-[220px] sm:max-w-[280px] lg:max-w-[320px] md:flex">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Image src="/svgs/search-icon.svg" alt="Search" width={18} height={18} />
            </span>
            <input
              type="search"
              placeholder="Search for lessons"
              className="w-full rounded-md border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-base font-normal text-white placeholder-white/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/40"
            />
          </div>
        ) : null}

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
                    href="/lessons/favourites"
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
          className="ml-auto inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <span className="relative block h-4 w-6">
            <span
              className={`absolute left-0 top-0 h-0.5 w-full origin-center rounded-full bg-white transition-transform duration-300 ease-in-out ${
                mobileOpen ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-0.5 w-full origin-center rounded-full bg-white transition-all duration-300 ease-in-out ${
                mobileOpen ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
              }`}
            />
            <span
              className={`absolute left-0 bottom-0 h-0.5 w-full origin-center rounded-full bg-white transition-transform duration-300 ease-in-out ${
                mobileOpen ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="md:hidden">
          <div className="border-t border-white/10 bg-[#2A153F] px-6 pb-6 pt-4 space-y-4">
            {showSearch ? (
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
            ) : null}
            <nav className="flex flex-col gap-3 text-base font-normal">
              <Link href="/lessons" onClick={closeMobile} className="transition hover:text-mint">
                Lessons
              </Link>
              <div className="ml-4 flex flex-col gap-2 text-sm text-white/80">
                <Link href="/lessons" onClick={closeMobile} className="transition hover:text-mint">
                  All Lessons
                </Link>
                <Link href="/lessons/core" onClick={closeMobile} className="transition hover:text-mint">
                  Core Lessons
                </Link>
                <Link href="/lessons/bitesize" onClick={closeMobile} className="transition hover:text-mint">
                  Bitesize Lessons
                </Link>
                <Link href="/lessons/favourites" onClick={closeMobile} className="transition hover:text-mint">
                  Favourite Lessons
                </Link>
              </div>
              <Link href="/stories" onClick={closeMobile} className="transition hover:text-mint">
                Stories
              </Link>
              <Link href="/leaders" onClick={closeMobile} className="transition hover:text-mint">
                Faculty
              </Link>
              {isAdmin ? (
                <>
                  <Link href="/admin/users" onClick={closeMobile} className="transition hover:text-mint">
                    Admin
                  </Link>
                  <div className="ml-4 flex flex-col gap-2 text-sm text-white/80">
                    <Link href="/admin/users" onClick={closeMobile} className="transition hover:text-mint">
                      Users
                    </Link>
                    <Link href="/admin/peer-groups" onClick={closeMobile} className="transition hover:text-mint">
                      Peer Groups
                    </Link>
                    <Link href="/admin/content" onClick={closeMobile} className="transition hover:text-mint">
                      Content
                    </Link>
                    <Link href="/admin/leaders" onClick={closeMobile} className="transition hover:text-mint">
                      Faculty
                    </Link>
                    <Link href="/admin/reports" onClick={closeMobile} className="transition hover:text-mint">
                      Reports
                    </Link>
                  </div>
                </>
              ) : null}
              <Link href="/profile" onClick={closeMobile} className="transition hover:text-mint">
                Profile
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
