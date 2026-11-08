# POps OAuth release security audit

Reviewed on 2026-11-07. Review remaining findings by 2026-12-07.

The release updates Next.js from 16.2.6 to 16.4.5 and Zod from 4.3.6 to 4.6.7. This fixes the server-action denial of service affecting the app's public login and OAuth consent actions, as well as the constrained-collection validation advisory. The lockfile also updates vulnerable compatible image/CSS/source-map dependencies. No major dependency upgrades were applied.

`npm audit --omit=dev` reports no critical findings and three high findings, all from the same Prisma CLI dependency chain: `prisma` → `@prisma/config` → `deepmerge-ts` (GHSA-ggr8-5vv4-36mx). The vulnerable operation merges recursive JavaScript object graphs in Prisma configuration. The app's request handlers use `@prisma/client`, not the Prisma CLI/config loader; CLI generation and migration consume only the repository's reviewed schema/configuration. Untrusted HTTP input does not reach this operation. A Prisma major-version migration is deferred to separate maintenance, with the review date above; it is unnecessary for this additive SQL migration.

The Next.js update exposes pre-existing TypeScript errors in test files. The release corrects their types, enables inference for the existing JavaScript pages/components, and uses ES2023 library declarations supported by the configured Node 22 runtime. Type checking and tests remain enabled.

References:
- https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
