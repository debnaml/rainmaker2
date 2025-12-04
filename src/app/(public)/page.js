import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-purplebg bg-cover bg-center bg-no-repeat p-6 text-textdark"
      style={{ backgroundImage: 'url(/images/rm-bg.jpg)' }}
    >
      <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">
        <div className="flex flex-col items-center gap-8">
          <div className="w-full max-w-[240px]">
            <Image
              src="/svgs/rainmaker-logo-full-primary.svg"
              alt="Rainmaker"
              width={240}
              height={72}
              priority
            />
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-action px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
