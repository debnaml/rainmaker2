'use client';

import Image from 'next/image';
import Link from 'next/link';

const footerLinks = [
  {
    title: 'Lessons',
    items: [
      { label: 'All Lessons', href: '/lessons' },
      { label: 'Core Lessons', href: '/lessons/core' },
      { label: 'Bitesize Lessons', href: '/lessons/bitesize' },
      { label: 'Stories', href: '/stories' },
      { label: 'Leaders', href: '/leaders' },
    ],
  },
  {
    title: 'Tagged Lessons',
    items: [
      { label: 'Leadership', href: '#' },
      { label: 'Client Success', href: '#' },
      { label: 'Wellbeing', href: '#' },
      { label: 'Professional Growth', href: '#' },
    ],
  },
  {
    title: 'Popular Lessons',
    items: [
      { label: 'Rainmaker Fundamentals', href: '#' },
      { label: 'Storytelling in Sales', href: '#' },
      { label: 'Negotiation Deep Dive', href: '#' },
      { label: 'Client Listening Lab', href: '#' },
    ],
  },
  {
    title: 'Progress',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Current Progress', href: '/current-progress' },
      { label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/profile' },
      { label: 'Favourites', href: '/lessons/favourites' },
    ],
  },
];

const bottomLinks = [
  { label: 'Terms of Use', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Cookies Policy', href: '#' },
  { label: 'Contact Us', href: '#' },
];

export default function Footer() {
  return (
    <footer className="mt-16 w-full text-textdark">
      <div className="bg-mint/50">
        <div className="mx-auto max-w-6xl px-6 py-[75px]">
          <Image
            src="/svgs/rainmaker-logo-full-primary.svg"
            alt="Rainmaker"
            width={180}
            height={20}
            className="h-5 w-auto"
            priority={false}
          />
          <div className="mt-[75px] grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            {footerLinks.map(({ title, items }, index) => {
              const columnClass = title === 'Popular Lessons' ? 'lg:col-span-2' : '';

              return (
                <div key={index} className={`space-y-4 ${columnClass}`}>
                {title ? (
                  <h3 className="text-base font-semibold text-primary">{title}</h3>
                ) : (
                  <div className="h-6" aria-hidden="true" />
                )}
                <ul className="space-y-3">
                  {items.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-base font-normal text-textdark/80 transition hover:text-primary"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="bg-primary">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">© Birketts LLP 2025</span>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {bottomLinks.map(({ label, href }) => (
              <Link key={label} href={href} className="transition hover:text-mint">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
