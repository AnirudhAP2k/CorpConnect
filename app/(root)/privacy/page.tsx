export const metadata = {
  title: "Privacy Policy — CorpConnect",
  description: "CorpConnect Privacy Policy and Data Handling Commitments.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-nx-surface text-nx-on-surface min-h-screen py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-6 md:px-8 space-y-10">
        <div>
          <span className="inline-block text-nx-on-tertiary-container font-label font-semibold tracking-[0.12em] uppercase text-xs mb-3">
            Legal & Compliance
          </span>
          <h1 className="text-4xl font-headline font-extrabold text-nx-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-nx-secondary text-sm mt-2">
            Last updated: July 2026
          </p>
        </div>

        <div className="prose prose-nx max-w-none text-nx-on-surface space-y-8 font-body leading-relaxed">
          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">1. Executive Overview</h2>
            <p className="text-nx-secondary text-sm">
              CorpConnect (&quot;we&quot;, &quot;our&quot;, or &quot;platform&quot;) provides a B2B relationship intelligence network. We are committed to protecting the privacy of participating organizations, executive members, and users. This Privacy Policy details our data collection, usage, and security practices.
            </p>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-nx-secondary text-sm">
              <li><strong>Organization & Profile Data:</strong> Industry, size, services, technology stack, KYB verification documents, and business interests.</li>
              <li><strong>Account Credentials & Contact Data:</strong> Name, work email address, job title, and authentication tokens.</li>
              <li><strong>Platform Interaction Data:</strong> Event participation, connection requests, industry group activity, and AI matchmaking preferences.</li>
              <li><strong>Technical Metadata:</strong> IP address, device headers, session parameters, and API access logs.</li>
            </ul>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">3. How We Use Data</h2>
            <p className="text-nx-secondary text-sm mb-3">
              We process data strictly to fulfill business networking purposes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-nx-secondary text-sm">
              <li>To power AI-driven organization-to-organization matchmaking and recommendations.</li>
              <li>To facilitate event hosting, attendance verification, and meeting scheduling.</li>
              <li>To verify organization legitimacy through our KYB compliance pipeline.</li>
              <li>To maintain platform security, prevent unauthorized cross-tenant access, and satisfy legal obligations.</li>
            </ul>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">4. Information Sharing & Third Parties</h2>
            <p className="text-nx-secondary text-sm">
              We do not sell organizational or member data. Public organization profile data is searchable across the CorpConnect ecosystem. Sensitive information (such as private pitch documents or KYB documentation) is restricted to authorized organization admins and platform compliance officers.
            </p>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">5. Data Retention & Rights</h2>
            <p className="text-nx-secondary text-sm">
              Organizations may request export or deletion of their account data at any time by contacting compliance at <a href="mailto:hello@corpconnect.io" className="text-nx-on-tertiary-container underline">hello@corpconnect.io</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
