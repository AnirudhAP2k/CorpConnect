# Next.js Rendering Strategies Audit

## Checklist
- [ ] Identify Next.js version and router type
- [x] Search codebase for "use client" (CSR usage).
- [x] Search codebase for dynamic rendering indicators (`export const dynamic`, headers, cookies).
- [x] Search codebase for static generation (`generateStaticParams`).
- [x] Search codebase for ISR indicators (`export const revalidate`, fetch cache).
- [x] Analyze key routes (e.g., home, events, organizations, dashboard) for optimal data fetching.
- [x] Write the audit report.
