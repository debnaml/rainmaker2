'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function SubNav({ items = [], activePathOverride = null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!items.length) return null;

  const activeOverride = activePathOverride ? new URL(activePathOverride, 'https://placeholder.local') : null;

  function isActive(href) {
    if (activeOverride) {
      const target = new URL(href, 'https://placeholder.local');
      return target.pathname === activeOverride.pathname && target.search === activeOverride.search;
    }

    if (!href) return false;
    const [hrefPath, queryString] = href.split('?');
    if (pathname !== hrefPath) return false;
    if (!queryString) return true;

    const query = new URLSearchParams(queryString);
    for (const [key, value] of query.entries()) {
      if (searchParams?.get(key) !== value) {
        return false;
      }
    }
    return true;
  }

  return (
    <div className="w-full border-b border-[#D9D9D9] bg-transparent">
      <nav className="mx-auto flex h-[50px] w-full max-w-6xl items-stretch gap-8 px-6">
        {items.map(({ href, label }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-full items-center border-b-2 px-1 text-base font-normal text-[#303030] transition-colors hover:text-action ${
                active ? 'border-[#237781]' : 'border-transparent'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
