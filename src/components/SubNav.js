'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubNav({ items = [] }) {
  const pathname = usePathname();

  if (!items.length) return null;

  return (
    <div className="w-full border-b border-[#D9D9D9] bg-transparent">
      <nav className="mx-auto flex h-[50px] w-full max-w-6xl items-stretch gap-8 px-6">
        {items.map(({ href, label }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full items-center border-b-2 px-1 text-base font-normal text-[#303030] transition-colors hover:text-action ${
                isActive ? 'border-[#237781]' : 'border-transparent'
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
