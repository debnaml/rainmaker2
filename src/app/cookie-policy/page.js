export const metadata = {
  title: 'Cookie Policy',
  description: 'Details of the cookies used across the Rainmaker platform.',
};

const COOKIE_DATA = [
  {
    name: '__Secure-next-auth.session-token',
    provider: 'Rainmaker / NextAuth.js',
    purpose: 'Maintains your authenticated session after you log in.',
    duration: 'Session for HTTP connections, up to 30 days on HTTPS.',
    category: 'Essential',
  },
  {
    name: 'next-auth.session-token',
    provider: 'Rainmaker / NextAuth.js',
    purpose: 'Fallback session cookie for non-HTTPS environments.',
    duration: 'Session',
    category: 'Essential',
  },
  {
    name: 'next-auth.csrf-token',
    provider: 'Rainmaker / NextAuth.js',
    purpose: 'Prevents cross-site request forgery attacks during sign-in, sign-out, and admin actions.',
    duration: 'Session',
    category: 'Security',
  },
  {
    name: 'next-auth.callback-url',
    provider: 'Rainmaker / NextAuth.js',
    purpose: 'Stores your most recent destination so we can redirect you after authentication.',
    duration: 'Session',
    category: 'Functional',
  },
  {
    name: 'next-auth.state / pkce.code_verifier',
    provider: 'Rainmaker / NextAuth.js',
    purpose: 'Supports secure OAuth flows (PKCE/state parameters) when signing in with enterprise identity providers.',
    duration: 'Session',
    category: 'Security',
  },
];

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto mb-16 mt-24 max-w-4xl px-6 text-textdark">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-primary">Compliance</p>
        <h1 className="text-4xl font-semibold text-primary">Cookie Policy</h1>
        <p className="text-lg text-textdark/80">
          This platform uses a minimal set of first-party cookies so we can keep your account secure and remember
          where you were in the product. We do not run advertising, analytics, or third-party tracking scripts.
        </p>
      </header>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-primary">Cookies we set</h2>
        <p className="text-base text-textdark/75">
          All cookies listed below are delivered directly by Rainmaker on behalf of Birketts LLP and are required for
          you to sign in, stay signed in, and access protected content. Removing or blocking these cookies will prevent
          the application from functioning correctly.
        </p>
        <div className="overflow-x-auto rounded-lg border border-[#E6E6E6] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-mint/40 text-xs font-semibold uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3">Cookie</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Category</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_DATA.map(({ name, purpose, duration, category, provider }) => (
                <tr key={name} className="border-t border-[#E6E6E6]">
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-primary">{name}</p>
                    <p className="text-xs text-textdark/60">{provider}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-textdark/80">{purpose}</td>
                  <td className="px-4 py-4 align-top text-sm text-textdark/80">{duration}</td>
                  <td className="px-4 py-4 align-top text-sm text-textdark/80">{category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold text-primary">Managing cookies</h2>
        <p className="text-base text-textdark/75">
          You can disable cookies in your browser settings, but this will immediately sign you out and prevent access to
          any authenticated content. If your organisation requires additional disclosures or data processing agreements,
          please contact the Birketts compliance team.
        </p>
        <p className="text-base text-textdark/75">
          For details on how we handle personal data more broadly, review our
          {' '}
          <a
            href="https://www.birketts.co.uk/compliance/privacy-notice/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline decoration-primary/40 transition hover:text-action"
          >
            Privacy Policy
          </a>
          .
        </p>
      </section>
    </main>
  );
}
