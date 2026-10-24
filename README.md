# Sundial Years

Free, source-cited retirement calculators for Americans — live at **[sundialyears.com](https://sundialyears.com)**.

- **Social Security**: when to claim (break-even, survival-weighted lifetime value, spousal & survivor), the earnings test, taxation of benefits
- **Medicare**: Part B / Part D premiums, IRMAA brackets for 2026 (official) and 2027 (projected until CMS publishes)
- **RMDs**: lifetime and inherited-IRA required minimum distributions with the IRS tables parsed from the eCFR
- **Reference pages**: RMD by age, Social Security by birth year, full retirement age chart, the 2027 COLA, all 2027 numbers, state taxes on retirement income

Every number lives in `src/data/params` with its primary source (SSA, CMS, IRS, Federal Register, eCFR) and a status:
`official`, `projected` or `not_yet_announced`. Raw official tables are converted by scripts in `scripts/data`.

## Stack

Next.js 16 (App Router, Cache Components, fully static public pages) · React 19 · Tailwind CSS 4 · TypeScript ·
Postgres (Neon) via Drizzle for the small server side (error inbox, contact form, feedback) · Cloudflare Workers for
mail notifications and backups · Vitest.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in what you need; calculators work without a database
npm run dev
```

Tests and checks:

```bash
npm test          # calculation engines, checked against the agencies' own worked examples
npm run lint
npx tsc --noEmit
```

Database (optional): set `DATABASE_URL`, then `npx tsx scripts/migrate.ts`.

## How the math is verified

1. Each engine in `src/lib/calc` implements the rule as written (CFR, POMS, IRS publications) and cites it.
2. Unit tests reproduce official worked examples (e.g. SSA's benefit-percentage table, IRS RMD factors, CMS premium rounding).
3. A guard test cross-checks every published parameter against the verified research data.

## Disclaimer

Educational estimates, not financial, tax, legal or Medicare-enrollment advice. Not affiliated with the Social Security
Administration, CMS/Medicare or the IRS.

## License

MIT
