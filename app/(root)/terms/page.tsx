export const metadata = {
  title: "Terms of Service — CorpConnect",
  description: "Terms of Service governing the use of the CorpConnect platform.",
};

export default function TermsPage() {
  return (
    <div className="bg-nx-surface text-nx-on-surface min-h-screen py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-6 md:px-8 space-y-10">
        <div>
          <span className="inline-block text-nx-on-tertiary-container font-label font-semibold tracking-[0.12em] uppercase text-xs mb-3">
            Legal & Governance
          </span>
          <h1 className="text-4xl font-headline font-extrabold text-nx-primary tracking-tight">
            Terms of Service
          </h1>
          <p className="text-nx-secondary text-sm mt-2">
            Last updated: July 2026
          </p>
        </div>

        <div className="prose prose-nx max-w-none text-nx-on-surface space-y-8 font-body leading-relaxed">
          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">1. Acceptance of Terms</h2>
            <p className="text-nx-secondary text-sm">
              By accessing or using CorpConnect (&quot;Platform&quot;), your organization agrees to be bound by these Terms of Service. If you are accepting on behalf of an entity, you represent that you have the authority to bind that entity to these terms.
            </p>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">2. Platform Membership & Eligibility</h2>
            <p className="text-nx-secondary text-sm">
              CorpConnect is a professional B2B platform. Access requires organization verification (KYB). Accounts found to misrepresent corporate identity, engage in unauthorized marketing, or violate platform standards are subject to immediate suspension.
            </p>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">3. Subscriptions & Billing</h2>
            <p className="text-nx-secondary text-sm">
              Subscription plans (FREE, PRO, ENTERPRISE) are billed on a recurring monthly or annual basis. Fees are non-refundable once billed, except as explicitly required by law. Organizations may upgrade or cancel subscriptions through their billing management dashboard.
            </p>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">4. Conduct & Intellectual Property</h2>
            <p className="text-nx-secondary text-sm">
              Users retain ownership of intellectual property submitted to the platform. Users agree not to scrape, reverse-engineer, or misuse API endpoints, pgvector embeddings, or matchmaking data.
            </p>
          </section>

          <section className="bg-nx-surface-container-lowest p-8 rounded-2xl shadow-nx-card">
            <h2 className="text-xl font-headline font-bold text-nx-primary mb-3">5. Limitation of Liability</h2>
            <p className="text-nx-secondary text-sm">
              CorpConnect is provided &quot;as is&quot;. In no event shall CorpConnect be liable for indirect, incidental, or consequential damages resulting from business connections or platform downtime.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
