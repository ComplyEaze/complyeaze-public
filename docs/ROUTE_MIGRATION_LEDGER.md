# Route Migration Ledger

This ledger tracks public route families before any private-app cleanup. A route
family is not ready for removal or redirect in the private ComplyEaze app until
its destination, evidence, cleanup rule, and rollback path are recorded here and
on the rendered `/migration/` page.

Family-level entries do not authorize cleanup by themselves. Each source route
being removed or redirected needs its own source host, source route, destination
host, destination route, hosted route 200, canonical, sitemap, redirect, cleanup
PR, and rollback evidence.

Host-aware rows are intentional: Pack and Tools routes are root-relative on their
own hosts, not `/pack/*` or `/tools/*` paths on `complyeaze.com`.

Hosting note (2026-09-30): `complyeaze.com` is already served from this
repository through GitHub Pages, and the owner approved search indexing of the
pages marked `indexed` (see `docs/HOSTING_CUTOVER.md`). That does not change any
row below: cleanup of private-app routes stays blocked until the hosted route
evidence, redirect, and rollback columns are filled in.

## Root public pages

- Source: Root public URLs on complyeaze.com: /, /resources/about-us, /resources/contact-us, /resources/privacy-policy, and /resources/terms-and-conditions
- Destination: complyeaze-public routes on complyeaze.com: /, /about/, /contact/, /trust/, /docs/, /migration/, /privacy/, /terms/, /status/, /changelog/, and /release-evidence/
- Status: root resource, trust/docs/migration, and policy/status/release pages seeded; cleanup blocked
- Cleanup rule: Do not remove parent routes until production host routing, canonical URLs, rollback redirects, and scripts/check-hosted-routes.mjs evidence are recorded.
- Parent cleanup: blocked; requires separate private-app cleanup PR after hosted and redirect evidence
- Evidence: Seed intent recorded. Hosted route, visual artifact, redirect, and private-app cleanup PR evidence are pending.
- Rollback: Keep parent routes available until the public static deploy serves matching routes and metadata, with hosted route evidence attached.

| Source host | Source route | Destination host | Destination route | Cleanup | Evidence | Redirect | Cleanup PR | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `complyeaze.com` | `/` | `complyeaze.com` | `/` | cleanup blocked | hosted 200, canonical, sitemap, and redirect evidence pending; hosted evidence: not recorded | no redirect planned until production host cutover; plan: no redirect planned until production host cutover | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `complyeaze.com` | `/resources/about-us` | `complyeaze.com` | `/about/` | cleanup blocked | hosted 200, canonical, sitemap, and redirect evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `complyeaze.com` | `/resources/contact-us` | `complyeaze.com` | `/contact/` | cleanup blocked | hosted 200, canonical, sitemap, and redirect evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `complyeaze.com` | `/resources/privacy-policy` | `complyeaze.com` | `/privacy/` | cleanup blocked | hosted 200, canonical, sitemap, and redirect evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `complyeaze.com` | `/resources/terms-and-conditions` | `complyeaze.com` | `/terms/` | cleanup blocked | hosted 200, canonical, sitemap, and redirect evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |

## Axal marketing

- Source: Axal public marketing URLs on axal.complyeaze.com: / and /<slug>
- Destination: complyeaze-public typed preview parity in apps/axal for / plus five /<slug> static public pages on axal.complyeaze.com; hosting and path routing remain pending
- Status: apps/axal typed preview parity for six same-host routes; hosting and cutover pending; cleanup blocked
- Cleanup rule: Do not move login, signup, reset, callback, or workspace flows into this repository.
- Parent cleanup: blocked; requires separate private-app cleanup PR after hosted and path-routing evidence
- Evidence: Typed preview parity is implemented in apps/axal from the canonical manifest; hosted route, path-routing, and private-app cleanup PR evidence are pending.
- Rollback: Preserve private-app path routing until Axal-hosted marketing routes and crawler metadata pass hosted route checks; restore private-app routing if cutover fails.

| Source host | Source route | Destination host | Destination route | Cleanup | Evidence | Redirect | Cleanup PR | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `axal.complyeaze.com` | `/` | `axal.complyeaze.com` | `/` | cleanup blocked | apps/axal typed preview parity implemented with local canonical metadata and sitemap exclusion; hosted and path-routing evidence pending; hosted evidence: not recorded | redirect not required for same-host same-path cutover; plan: redirect not required for same-host same-path cutover | not linked | restore private-app path routing if public route cutover fails; owner/path: private-app path-routing owner not assigned |
| `axal.complyeaze.com` | `/ca-practice-management-software` | `axal.complyeaze.com` | `/ca-practice-management-software` | cleanup blocked | apps/axal typed preview parity implemented with local canonical metadata and sitemap exclusion; hosted and path-routing evidence pending; hosted evidence: not recorded | redirect not required for same-host same-path cutover; plan: redirect not required for same-host same-path cutover | not linked | restore private-app path routing if public route cutover fails; owner/path: private-app path-routing owner not assigned |
| `axal.complyeaze.com` | `/gst-notice-management-software` | `axal.complyeaze.com` | `/gst-notice-management-software` | cleanup blocked | apps/axal typed preview parity implemented with local canonical metadata and sitemap exclusion; hosted and path-routing evidence pending; hosted evidence: not recorded | redirect not required for same-host same-path cutover; plan: redirect not required for same-host same-path cutover | not linked | restore private-app path routing if public route cutover fails; owner/path: private-app path-routing owner not assigned |
| `axal.complyeaze.com` | `/compliance-calendar-software-india` | `axal.complyeaze.com` | `/compliance-calendar-software-india` | cleanup blocked | apps/axal typed preview parity implemented with local canonical metadata and sitemap exclusion; hosted and path-routing evidence pending; hosted evidence: not recorded | redirect not required for same-host same-path cutover; plan: redirect not required for same-host same-path cutover | not linked | restore private-app path routing if public route cutover fails; owner/path: private-app path-routing owner not assigned |
| `axal.complyeaze.com` | `/gst-reconciliation-evidence-review` | `axal.complyeaze.com` | `/gst-reconciliation-evidence-review` | cleanup blocked | apps/axal typed preview parity implemented with local canonical metadata and sitemap exclusion; hosted and path-routing evidence pending; hosted evidence: not recorded | redirect not required for same-host same-path cutover; plan: redirect not required for same-host same-path cutover | not linked | restore private-app path routing if public route cutover fails; owner/path: private-app path-routing owner not assigned |
| `axal.complyeaze.com` | `/client-document-collection-portal-access` | `axal.complyeaze.com` | `/client-document-collection-portal-access` | cleanup blocked | apps/axal typed preview parity implemented with local canonical metadata and sitemap exclusion; hosted and path-routing evidence pending; hosted evidence: not recorded | redirect not required for same-host same-path cutover; plan: redirect not required for same-host same-path cutover | not linked | restore private-app path routing if public route cutover fails; owner/path: private-app path-routing owner not assigned |

## Pack public pages

- Source: Pack public URLs on pack.complyeaze.com: /, /source, /status, /changelog, /support, /security, /privacy, /terms, /acceptable-use, /docs, /release-automation, and /gst
- Destination: /products/pack/ for family-level context, then pack.complyeaze.com for product-owned source, install, release, privacy, security, and support facts
- Status: gateway seeded; cleanup blocked
- Cleanup rule: Do not copy extension permissions, release claims, or store-readiness language without Pack release evidence.
- Parent cleanup: blocked; requires separate private-app cleanup PR after hosted and redirect evidence
- Evidence: Seed intent recorded. Pack-hosted route, release-facts, redirect, and private-app cleanup PR evidence are pending.
- Rollback: Keep parent Pack pages or redirects until Pack-hosted pages, release-facts checks, and hosted route evidence are green.

| Source host | Source route | Destination host | Destination route | Cleanup | Evidence | Redirect | Cleanup PR | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pack.complyeaze.com` | `/` | `pack.complyeaze.com` | `/` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/source` | `pack.complyeaze.com` | `/source` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/status` | `pack.complyeaze.com` | `/status` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/changelog` | `pack.complyeaze.com` | `/changelog` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/support` | `pack.complyeaze.com` | `/support` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/security` | `pack.complyeaze.com` | `/security` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/privacy` | `pack.complyeaze.com` | `/privacy` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/terms` | `pack.complyeaze.com` | `/terms` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/acceptable-use` | `pack.complyeaze.com` | `/acceptable-use` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/docs` | `pack.complyeaze.com` | `/docs` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/release-automation` | `pack.complyeaze.com` | `/release-automation` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `pack.complyeaze.com` | `/gst` | `pack.complyeaze.com` | `/gst` | cleanup blocked | Pack-hosted route and release-facts evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |

## Tools public utilities

- Source: Tools public URLs on tools.complyeaze.com: /evidence-packet and /sanchika
- Destination: /products/tools/ for family-level context, then tools.complyeaze.com for utility-owned runtime and release evidence
- Status: gateway seeded; cleanup blocked
- Cleanup rule: Do not add account, upload, backend, or document-custody behavior to this repository.
- Parent cleanup: blocked; requires separate private-app cleanup PR after hosted and redirect evidence
- Evidence: Seed intent recorded. Tools-hosted route, local-only runtime, redirect, and private-app cleanup PR evidence are pending.
- Rollback: Keep parent Tools routes until the static utility host serves equivalent public pages and hosted route evidence is recorded.

| Source host | Source route | Destination host | Destination route | Cleanup | Evidence | Redirect | Cleanup PR | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tools.complyeaze.com` | `/evidence-packet` | `tools.complyeaze.com` | `/evidence-packet` | cleanup blocked | Tools-hosted route and local-only evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
| `tools.complyeaze.com` | `/sanchika` | `tools.complyeaze.com` | `/sanchika` | cleanup blocked | Tools-hosted route and Sanchika adoption evidence pending; hosted evidence: not recorded | redirect not configured; plan: redirect not configured | not linked | keep parent route until redirect rollback is tested; owner/path: keep parent route until redirect rollback is tested |
