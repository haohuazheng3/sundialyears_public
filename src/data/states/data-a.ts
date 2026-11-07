/**
 * Alabama – Idaho (incl. DC). Facts: docs/research/states_a.json, checked against docs/research/verify_states_a.json.
 * Verifier corrections applied: AR brackets (Table A only applies up to $94,700 — noted), AZ property tax credit
 * limits, HI standard-deduction schedule through 2031. Unverifiable items are softened and listed in `notes`.
 */
import type { StateTaxInput } from "./types";

const V = "2026-10-23" as const;

export const STATES_A: StateTaxInput[] = [
  {
    code: "AL",
    name: "Alabama",
    slug: "alabama",
    taxYear: 2026,
    taxYearNote: "Alabama’s 2025 Form 40 rules carry into 2026 for retirement income; its brackets are set in law and are not indexed.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Alabama does not tax Social Security benefits.",
      detail: "Social Security is on Alabama’s list of income you do not report at all — there is no age test and no income test.",
    },
    pensions: {
      taxed: "no",
      summary: "Public pensions and private defined-benefit pensions are fully exempt at any age.",
      detail:
        "Alabama’s do-not-report list includes the state Teachers’, Employees’ and Judicial retirement systems, federal civil service retirement, TVA pensions, Railroad Retirement and any private defined-benefit plan under IRC 414(j). Other pensions and annuities are taxable, but at 65 or older each person can exclude up to $6,000 of them — the same exclusion that covers IRAs.",
      publicVsPrivate:
        "Public pensions and private defined-benefit pensions are treated alike: both are exempt. Annuities and private plans that are not defined-benefit are taxable, minus the $6,000 exclusion at 65+.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals are taxable, but each person 65 or older can exclude up to $6,000 a year.",
      detail:
        "IRA, 401(k), 403(b), SEP and Keogh distributions are reported on Schedule RS. A taxpayer 65 or older can exclude up to $6,000, and a spouse 65 or older gets a separate $6,000, limited to the retirement income Alabama would otherwise tax. There is no income limit.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt." },
    relief: {
      level: "large",
      headline: "Defined-benefit pensions are fully exempt, and each person 65+ can exclude another $6,000 of IRA or 401(k) income.",
    },
    rates: {
      type: "graduated",
      topRate: 5,
      brackets: [
        { over: 0, overJoint: 0, rate: 2 },
        { over: 500, overJoint: 1000, rate: 4 },
        { over: 3000, overJoint: 6000, rate: 5 },
      ],
      summary:
        "2% on the first $500 of taxable income, 4% on the next $2,500 and 5% above $3,000 (married filing jointly: $1,000, $5,000 and $6,000). The brackets are set in law and don’t change with inflation. Alabama also lets you deduct the federal income tax you paid.",
    },
    deductions:
      "The standard deduction shrinks as income rises: $3,000 for single filers, falling to $2,500; $8,500 for married couples filing jointly at Alabama AGI up to $25,999, falling to $5,000 at $35,500 and above (head of family $5,200 to $2,500; married filing separately $4,250 to $2,500). Personal exemption: $1,500 single, $3,000 joint. These amounts are set in law and carry into 2026.",
    seniorBreaks:
      "The $6,000-per-person retirement income exclusion at 65 is the main senior break. Alabama has no extra standard deduction for age and has not adopted the federal $6,000 senior deduction for 2025–2028.",
    changes:
      "HB 527, signed April 16, 2026, adds a deduction of up to $1,000 of qualified overtime pay for tax years 2026 through 2028. We found no enacted 2026 change to how Alabama taxes retirement income.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Public pensions and private defined-benefit pensions are exempt at any age.",
      "At 65+, up to $6,000 per person of IRA and 401(k) income is excluded — no income limit.",
      "The 5% top rate starts at just $3,000 of taxable income ($6,000 joint).",
      "You can deduct the federal income tax you paid on your Alabama return.",
    ],
    metaDescription:
      "Alabama doesn’t tax Social Security, military pay or defined-benefit pensions, and excludes $6,000 of IRA income at 65+. Full 2026 rules, rates and sources.",
    sources: [
      { label: "Alabama Department of Revenue — What is Alabama’s individual income tax rate?", url: "https://www.revenue.alabama.gov/faqs/what-is-alabamas-individual-income-tax-rate/" },
      { label: "Alabama Department of Revenue — 2025 Form 40 instruction booklet", url: "https://www.revenue.alabama.gov/wp-content/uploads/2026/01/25f40bk.pdf" },
      { label: "Alabama Department of Revenue — 2025 Schedule RS instructions (retirement exclusion)", url: "https://www.revenue.alabama.gov/wp-content/uploads/2026/01/25schrsblk.pdf" },
      { label: "Alabama Department of Revenue — One Big Beautiful Bill Act executive summary", url: "https://www.revenue.alabama.gov/wp-content/uploads/2025/11/OBBBA-Executive-Summary_FinalwAppendixA_10.31.25.pdf" },
      { label: "Office of the Governor — HB 527 overtime tax relief signed (April 2026)", url: "https://governor.alabama.gov/newsroom/2026/04/governor-ivey-signs-bill-to-provide-tax-relief-to-hardworking-alabamians/" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Our verifier could not sweep every 2026 bill, so we say only that we found no enacted change to retirement taxation."],
  },
  {
    code: "AK",
    name: "Alaska",
    slug: "alaska",
    taxYear: 2026,
    taxYearNote: "Alaska repealed its individual income tax in 1980.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Alaska has no individual income tax, so Social Security is not taxed.",
      detail: "The legislature repealed the state income tax on individuals in 1980 (AS 43.20.011). No retirement income of any kind is taxed by the state.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed — Alaska has no individual income tax.", detail: "Public and private pensions are untaxed because there is no state income tax on individuals." },
    iraAnd401k: {
      taxed: "no",
      summary: "IRA and 401(k) withdrawals are not taxed.",
      detail: "With no individual income tax, withdrawals and required minimum distributions owe no state tax.",
    },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No individual income tax, so every kind of retirement income is untaxed by the state." },
    rates: {
      type: "none",
      topRate: 0,
      summary: "No individual income tax. Alaska also has no statewide sales tax, though some local governments charge their own sales taxes.",
    },
    deductions: "Not applicable — there is no individual income tax.",
    seniorBreaks: "Not applicable to income tax.",
    changes: "We found no enacted proposal to bring back an individual income tax.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "The individual income tax was repealed in 1980.",
      "No statewide sales tax, though some localities levy one.",
    ],
    noTaxNote: "The individual income tax was repealed in 1980, and there is no statewide sales tax.",
    metaDescription:
      "Alaska has no individual income tax, so Social Security, pensions, IRA and 401(k) withdrawals and military pay are all untaxed. 2026 facts from state sources.",
    sources: [
      { label: "Alaska Department of Administration — Alaska Administrative Manual 360", url: "https://doa.alaska.gov/dof/manuals/aam/resource/360.pdf" },
      { label: "Alaska Department of Revenue — Fall 2018 Revenue Sources Book release", url: "https://dor.alaska.gov/docs/default-source/press-releases/2018_12_14-department-of-revenue-releases-fall-2018-revenue-sources-book.pdf?sfvrsn=ddfa3f5d_3" },
      { label: "Alaska Tax Division — Annual Report", url: "https://tax.alaska.gov/programs/programs/reports/AnnualReport.aspx?Year=2021" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "AZ",
    name: "Arizona",
    slug: "arizona",
    taxYear: 2026,
    taxYearNote: "The 2.5% rate is set in law; details come from the 2025 Form 140 booklet and HB 4168 (Laws 2026, Ch. 140, signed June 13, 2026).",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Arizona does not tax Social Security benefits.",
      detail: "Social Security benefits are fully exempt, with no age or income test. Tier 1 and Tier 2 Railroad Retirement benefits are exempt too.",
    },
    pensions: {
      taxed: "yes",
      summary: "Pensions are taxed, except up to $2,500 per person of Arizona or federal government pension.",
      detail:
        "Pensions from the U.S. Civil Service Retirement and Disability Fund and from Arizona state or local retirement systems get a subtraction of the amount received or $2,500, whichever is less, per taxpayer, at any age. Public pensions from other states do not qualify, and private pensions get no subtraction.",
      publicVsPrivate: "Arizona and federal civil service pensions: up to $2,500 per person exempt. Other states’ public pensions and all private pensions: fully taxable.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are fully taxable at 2.5%.",
      detail: "They are taxed as they appear in your federal adjusted gross income (AGI). Arizona has no general retirement-income exclusion, and the 2026 tax law (Ch. 140) did not add one.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt (a 100% subtraction), and surviving spouses can subtract survivor benefits too." },
    relief: { level: "narrow", headline: "Only Arizona and federal government pensions get a break — up to $2,500 per person." },
    rates: { type: "flat", topRate: 2.5, flatRate: 2.5, summary: "A flat 2.5% on all income for every filing status. We found no enacted change for 2026." },
    deductions:
      "For 2025 the standard deduction is $15,750 single, $31,500 married filing jointly and $23,625 head of household. The 2026 amount is indexed and has not been published yet by the Arizona Department of Revenue. Each person 65 or older gets an extra $2,100 exemption ($1,500 if blind). Starting in 2026 you can add charitable gifts to the standard deduction, up to $1,000 single or $2,000 joint.",
    seniorBreaks:
      "Arizona copies the federal senior deduction as a state subtraction: up to $6,000 per person 65 or older, phased out above $75,000 of modified AGI ($150,000 joint), for 2025–2028. Each person 65+ also gets a $2,100 exemption. A property tax credit (Form 140PTC) is available at 65+ (or on SSI) if household income is under $3,751 living alone or under $5,501 living with others.",
    changes:
      "HB 4168 (Laws 2026, Ch. 140), signed June 13, 2026, conforms Arizona to the federal tax code as of January 1, 2026, back to 2025. It adds subtractions mirroring the federal senior deduction, tips and overtime (from 2025, to the extent deducted federally) and car-loan interest (2025 only). From 2026 it raises the dependent credit from $100 to $125 and lets charitable gifts raise the standard deduction.",
    highlights: [
      "Flat 2.5% income tax on everything that is taxable.",
      "Social Security and military retirement pay are fully exempt.",
      "Private pensions and IRA/401(k) withdrawals are fully taxable.",
      "Only $2,500 per person of Arizona or federal civil service pension is exempt.",
      "A state version of the federal $6,000 senior deduction applies for 2025–2028.",
    ],
    metaDescription:
      "Arizona exempts Social Security and military pay but taxes IRA withdrawals and most pensions at a flat 2.5%. See the 2026 senior deduction, credits and sources.",
    sources: [
      { label: "Arizona Department of Revenue — 2025 Form 140 resident booklet", url: "https://azdor.gov/sites/default/files/document/FORMS_INDIVIDUAL_2025_140Booklet.pdf" },
      { label: "Arizona Legislature — HB 4168 (Laws 2026, Ch. 140) summary as enacted", url: "https://www.azleg.gov/legtext/57leg/2R/summary/S.1861-4168ATT_ASENACTED.DOCX.htm" },
      { label: "Arizona Department of Revenue — Executive order and 2025 income tax forms", url: "https://azdor.gov/news-center/ador-outlines-executive-order-and-2025-tax-year-income-tax-forms" },
      { label: "Arizona Department of Revenue — Middle Class Tax Cuts Package worksheet", url: "https://azdor.gov/forms/individual/middle-class-tax-cuts-package-mctcp-worksheet" },
      { label: "Arizona Legislature — SB 1106 fact sheet (2026)", url: "https://www.azleg.gov/legtext/57leg/2R/summary/S.1106FIN.DOCX.htm" },
    ],
    confidence: "medium",
    lastVerified: V,
    notes: [
      "Arizona’s 2026 standard deduction has not been published, so we show the 2025 amounts.",
      "We could not confirm what happened to SB 1106, a 2026 bill for a $6,000 retirement-income subtraction at 60+; it is not part of the enacted 2026 tax law, so we don’t count it.",
    ],
  },
  {
    code: "AR",
    name: "Arkansas",
    slug: "arkansas",
    taxYear: 2026,
    taxYearNote: "2026 rates come from Act 2 of the 2026 First Extraordinary Session; retirement exemptions from the 2025 AR1000F instructions, unchanged.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Arkansas does not tax Social Security benefits.",
      detail: "Social Security, VA benefits, workers’ compensation and Railroad Retirement benefits are exempt, with no age or income test.",
    },
    pensions: {
      taxed: "partially",
      summary: "The first $6,000 per person of employer pension income is exempt; the rest is taxed.",
      detail:
        "The first $6,000 a year of public or private employer-sponsored retirement benefits is exempt per taxpayer, at any age and with no income test. That $6,000 is one combined cap across all plans, including IRAs. A surviving spouse is limited to a single $6,000.",
      publicVsPrivate: "Public and private employer pensions share the same $6,000 exemption.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA withdrawals after 59½ and 401(k) payouts share the same $6,000-per-person exemption.",
      detail:
        "Traditional IRA distributions qualify only after age 59½ (or on death or disability); 401(k) and other employer plans fall under the employer-plan exemption. Total exemptions from all plans cannot exceed $6,000 per taxpayer.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt. If it uses less than $6,000, the rest of the $6,000 exemption can cover other retirement income." },
    relief: { level: "small", headline: "The first $6,000 per person of pension and IRA/401(k) income is exempt (one combined cap)." },
    rates: {
      type: "graduated",
      topRate: 3.7,
      brackets: [
        { over: 0, overJoint: 0, rate: 0 },
        { over: 5599, overJoint: 5599, rate: 2 },
        { over: 11199, overJoint: 11199, rate: 3 },
        { over: 15999, overJoint: 15999, rate: 3.4 },
        { over: 26399, overJoint: 26399, rate: 3.7 },
      ],
      bracketsNote:
        "This table applies when net income is $94,700 or less, for every filing status. Above $94,700 a different table applies: 2% on the first $4,700 and 3.7% on the rest, less a bracket adjustment that shrinks from $290 to $0 between $94,701 and $97,600. Above $97,600 that works out to 3.7% of net income minus $79.90.",
      summary:
        "Top rate 3.7% for 2026, down from 3.9% in 2025 (Act 2 of 2026, retroactive to January 1). Arkansas taxes each person separately — married couples may file separately on the same return — and the brackets are indexed each year.",
    },
    deductions:
      "For 2025 the standard deduction is $2,470 single and $4,940 married filing jointly. The 2026 return amount is indexed and not yet published (the 2026 withholding formula still uses $2,470). Each personal tax credit is $29.",
    seniorBreaks: "Filers 65 or older get an extra personal tax credit, and anyone 65+ who does not claim the retirement income exemption gets an additional $29 “65 Special” credit.",
    changes:
      "Act 2 of the 2026 First Extraordinary Session (approved May 6, 2026) cut the top individual rate to 3.7% for tax years starting January 1, 2026. We found no 2025 or 2026 law changing the $6,000 retirement exemption.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "The first $6,000 per person of pension, IRA and 401(k) income is exempt — one combined cap.",
      "IRA withdrawals count only after age 59½.",
      "Top rate cut to 3.7% for 2026, retroactive to January 1.",
      "One tax table for every filing status; couples can file separately on one return.",
    ],
    metaDescription:
      "Arkansas exempts Social Security and military pay, plus the first $6,000 per person of pension and IRA income. Its top rate falls to 3.7% for 2026. Full rules.",
    sources: [
      { label: "Arkansas Legislature — Act 2 of the 2026 First Extraordinary Session", url: "https://www.arkleg.state.ar.us/Home/FTPDocument?path=%2FACTS%2F2026S1%2FPublic%2FACT2.pdf" },
      { label: "Arkansas DFA — 2026 withholding tax formula", url: "https://www.dfa.arkansas.gov/wp-content/uploads/Withholding-Tax-Formula.pdf" },
      { label: "Arkansas DFA — 2025 AR1000F/AR1000NR instructions", url: "https://www.dfa.arkansas.gov/wp-content/uploads/2025_AR1000F_and_AR1000NR_Instructions.pdf" },
      { label: "Arkansas DFA — Withholding tables adjusted after the latest tax cut", url: "https://www.dfa.arkansas.gov/news/income-tax-withholding-tables-adjusted-due-to-most-recent-tax-cut/" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Arkansas’s 2026 standard deduction is indexed and not yet published; we show the 2025 amounts."],
  },
  {
    code: "CA",
    name: "California",
    slug: "california",
    taxYear: 2026,
    taxYearNote: "The Franchise Tax Board (FTB) published the indexed 2026 brackets and credits in its October 2026 Tax News.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "California does not tax Social Security benefits.",
      detail: "U.S. Social Security benefits and equivalent Tier 1 Railroad Retirement benefits are excluded from California taxable income, with no age or income test.",
    },
    pensions: {
      taxed: "yes",
      summary: "Public and private pensions are fully taxable.",
      detail: "Pensions are taxed as they appear in federal AGI. California has no age-based pension exclusion; the only carve-out is the new military retirement exclusion.",
      publicVsPrivate: "Treated the same: both fully taxable.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA, 401(k) and 403(b) withdrawals are fully taxable.",
      detail: "California follows the federal treatment and has no retirement income exclusion. Early withdrawals can also owe a California additional tax.",
    },
    military: {
      taxed: "partially",
      summary:
        "For 2025–2029, up to $20,000 of military retirement pay (or Survivor Benefit Plan annuity) is excluded if AGI is $125,000 or less ($250,000 joint); the rest is taxed.",
    },
    relief: { level: "none", headline: "No retirement income exclusion beyond the new military one." },
    rates: {
      type: "graduated",
      topRate: 12.3,
      brackets: [
        { over: 0, overJoint: 0, rate: 1 },
        { over: 11456, overJoint: 22912, rate: 2 },
        { over: 27157, overJoint: 54314, rate: 4 },
        { over: 42861, overJoint: 85722, rate: 6 },
        { over: 59498, overJoint: 118996, rate: 8 },
        { over: 75197, overJoint: 150394, rate: 9.3 },
        { over: 384109, overJoint: 768218, rate: 10.3 },
        { over: 460927, overJoint: 921854, rate: 11.3 },
        { over: 768213, overJoint: 1536426, rate: 12.3 },
      ],
      summary:
        "Nine brackets from 1% to 12.3% in 2026; the top bracket starts above $768,213 single and $1,536,426 married filing jointly. A separate 1% Behavioral Health Services Tax applies to taxable income over $1 million.",
    },
    deductions:
      "2026 standard deduction: $5,900 single or married filing separately; $11,800 joint, surviving spouse or head of household (2025: $5,706 and $11,412). Personal exemption credit: $158 per person ($316 joint); dependent credit $491. The credits phase out at higher incomes.",
    seniorBreaks:
      "Each person 65 or older gets an extra senior exemption credit equal to the personal credit — $158 for 2026. A Senior Head of Household Credit exists for qualifying people 65+. California has not adopted the federal $6,000 senior deduction.",
    changes:
      "The military retirement exclusion (SB 132) runs for tax years 2025 through 2029. SB 1435 (Ch. 233, 2026) made technical updates to federal conformity. SB 1407, which would raise the military exclusion to $40,000, had not been enacted as of FTB’s October 2026 Tax News. FTB will post complete 2026 tax tables in late December 2026.",
    highlights: [
      "Social Security is fully exempt.",
      "Pensions and IRA/401(k) withdrawals are fully taxed — no age-based exclusion.",
      "Rates run from 1% to 12.3%, plus 1% on taxable income over $1 million.",
      "New for 2025–2029: up to $20,000 of military retirement pay excluded (income limits apply).",
      "An extra $158 senior exemption credit per person 65+ in 2026.",
    ],
    metaDescription:
      "California exempts Social Security but fully taxes pensions and IRA withdrawals at 1% to 12.3%. See 2026 brackets, senior credits and the military exclusion.",
    sources: [
      { label: "Franchise Tax Board — Tax News (2026 indexing)", url: "https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html" },
      { label: "Franchise Tax Board — Military filing situations", url: "https://www.ftb.ca.gov/file/personal/filing-situations/military.html" },
      { label: "Franchise Tax Board — 2025 Schedule CA (540) instructions", url: "https://www.ftb.ca.gov/forms/2025/2025-540-ca-instructions.html" },
      { label: "Franchise Tax Board — 2025 Form 540 booklet", url: "https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html" },
      { label: "Franchise Tax Board — 2025 tax rate schedules", url: "https://www.ftb.ca.gov/forms/2025/2025-540-tax-rate-schedules.pdf" },
      { label: "Franchise Tax Board — SB 132 bill analysis", url: "https://www.ftb.ca.gov/tax-pros/law/legislation/2025-2026/SB132-062425.pdf" },
      { label: "Franchise Tax Board — SB 1407 bill analysis", url: "https://www.ftb.ca.gov/tax-pros/law/legislation/2025-2026/SB1407-051426.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["We could not confirm the final legislative status of SB 1407 (a $40,000 military exclusion); FTB reported no enactment as of October 2026."],
  },
  {
    code: "CO",
    name: "Colorado",
    slug: "colorado",
    taxYear: 2026,
    taxYearNote: "The 4.4% rate is set in law; no TABOR temporary rate cut or refund is expected for 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      exemptAt65: true,
      whoPays: "Only some people under 65: at 55–64 with AGI over $75,000 ($95,000 joint) once benefits and other retirement income pass $20,000; under 55, generally all taxable benefits.",
      summary: "Colorado fully exempts Social Security at 65 or older; some people under 65 with higher incomes pay tax on part of it.",
      detail:
        "Taxable Social Security is included in Colorado income and then subtracted. At 65 or older (by year-end) you can subtract all of it. From 2025, at 55–64 you can subtract all of it if AGI is $75,000 or less single or $95,000 or less joint; above those amounts it falls under the shared $20,000 pension cap. Under 55 it generally can’t be subtracted (death benefits are an exception). On a joint return each spouse is figured separately, and a Social Security subtraction uses up room under the cap for other pension income.",
    },
    pensions: {
      taxed: "partially",
      summary: "At 55–64, up to $20,000 a person of pension and IRA income is subtracted; at 65+, up to $24,000.",
      detail:
        "The pension and annuity subtraction is generally for people 55 or older. It is limited to $20,000 a year, or $24,000 for people 65 or older, per person. Public and private pensions qualify alike, and the cap is shared with IRA withdrawals (and, for some people under 65, Social Security).",
      publicVsPrivate: "Public and private pensions are treated the same.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "Taxable IRA and 401(k) withdrawals share the same $20,000 / $24,000 subtraction.",
      detail: "Traditional, SEP and SIMPLE IRA distributions and employer-plan distributions count within the cap. IRA distributions that are premature for federal purposes do not qualify.",
    },
    military: {
      taxed: "partially",
      summary: "Under 55, up to $15,000 of military retirement pay can be subtracted (2022–2028). At 55+, it falls under the general $20,000 / $24,000 pension subtraction.",
    },
    relief: {
      level: "large",
      headline: "Up to $24,000 per person of pension and IRA income is subtracted at 65+ ($20,000 at 55–64), and all Social Security is exempt at 65+.",
    },
    rates: {
      type: "flat",
      topRate: 4.4,
      flatRate: 4.4,
      summary:
        "A flat 4.4% on Colorado taxable income, which starts from federal taxable income. The Legislative Council’s September 2026 forecast shows no TABOR refund and no temporary rate cut for 2026; the next temporary cut (to 4.36%) is projected for 2029.",
    },
    deductions:
      "Colorado starts from federal taxable income, so your federal standard or itemized deduction carries over. If AGI is over $300,000, deductions above $1,000 single or $2,000 joint must be added back from 2026 ($12,000 / $16,000 for 2023–2025).",
    seniorBreaks:
      "Besides the pension and Social Security subtractions, the federal $6,000 senior deduction (2025–2028) flows through automatically because Colorado starts from federal taxable income. The Property Tax/Rent/Heat Credit rebate is available to people 65+ (surviving spouses 58+), based on income.",
    changes:
      "The full Social Security subtraction for ages 55–64 under the income limits began in 2025. Federal overtime deductions must be added back from 2026. HB26-1062, which would have removed the pension cap from 2027, was postponed indefinitely on February 9, 2026. On the November 3, 2026 ballot: Amendment 87 would replace the flat tax with graduated rates from 2027 (3.7% up to $25,000, rising to 8.4% over $1 million, not indexed), and Proposition 136 would cap the rate at 4.4% from 2027.",
    highlights: [
      "All Social Security is exempt at 65 or older.",
      "Up to $24,000 per person of pension and IRA income is subtracted at 65+ ($20,000 at 55–64).",
      "Flat 4.4% rate, and the federal $6,000 senior deduction flows through.",
      "No TABOR refund or temporary rate cut is expected for 2026.",
      "Two ballot measures on November 3, 2026 could change rates from 2027.",
    ],
    metaDescription:
      "Colorado exempts Social Security at 65+ and subtracts up to $24,000 per person of pension and IRA income. Flat 4.4% rate. 2026 rules, ballot measures, sources.",
    faqExtra: [
      {
        q: "What is on Colorado’s November 2026 ballot for income tax?",
        a: "Two measures. Amendment 87 would replace the flat 4.4% tax with graduated rates from 2027 — 3.7% on income up to $25,000, rising to 8.4% on income over $1 million, not indexed. Proposition 136 would cap the rate at 4.4% from January 1, 2027. Neither changes the 2026 rules on this page.",
      },
    ],
    sources: [
      { label: "Colorado Department of Revenue — Social Security, pensions and annuities", url: "https://tax.colorado.gov/income-tax-topics-social-security-pensions-and-annuities" },
      { label: "Colorado Department of Revenue — Individual income tax guide", url: "https://tax.colorado.gov/individual-income-tax-guide" },
      { label: "Colorado Department of Revenue — Senior tax credits", url: "https://tax.colorado.gov/information-on-senior-tax-credits" },
      { label: "Colorado State Auditor — 2026-TE5 federal tax law changes report", url: "https://content.leg.colorado.gov/sites/default/files/2026-te5-report-federal-tax-law-provisions-and-changes-impact-colorado-accessible.pdf" },
      { label: "Colorado Legislative Council — September 2026 economic forecast", url: "https://content.leg.colorado.gov/publications/forecast-september-2026" },
      { label: "Colorado General Assembly — HB26-1062", url: "https://leg.colorado.gov/bills/hb26-1062" },
      { label: "Colorado Blue Book — Amendment 87 (graduated income tax)", url: "https://leg.colorado.gov/ballots/graduated-income-tax-2/files/blue-book" },
      { label: "Colorado Blue Book — Proposition 136 (income tax rate limit)", url: "https://leg.colorado.gov/ballots/income-tax-rate-limit-2/files/blue-book" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["The military subtraction for retirees under 55 is stated for 2022–2028; the Department of Revenue has not said what applies from 2029."],
  },
  {
    code: "CT",
    name: "Connecticut",
    slug: "connecticut",
    taxYear: 2026,
    taxYearNote: "Rules from the 2025 CT-1040 instructions (Rev. 12/25); the IRA subtraction reaches 100% in 2026 under existing law.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      whoPays: "Filers with federal AGI of $75,000 or more ($100,000 joint or head of household) — at most 25% of benefits.",
      summary: "Social Security is fully exempt below $75,000 of AGI ($100,000 joint); above that, at most 25% of benefits is taxed.",
      detail:
        "Benefits are fully exempt if federal AGI is under $75,000 (single or married filing separately) or under $100,000 (married filing jointly, surviving spouse or head of household). Above those amounts a worksheet subtraction applies, so at most 25% of your benefits is taxable in Connecticut.",
    },
    pensions: {
      taxed: "partially",
      summary: "Pensions are 100% exempt below $75,000 of AGI ($100,000 joint), phasing out to nothing at $100,000 ($150,000 joint).",
      detail:
        "The pension and annuity subtraction (defined-benefit plans, 401(k), 403(b), 457(b)) is 100% when federal AGI is under $75,000 for single, married filing separately or head of household, or under $100,000 for joint filers. Above that it phases down by table — 85% at $75,000–$77,499 single or $100,000–$104,999 joint — and reaches zero at $100,000 single or $150,000 joint. Connecticut Teachers’ Retirement System benefits can take a 50% subtraction instead (not both).",
      publicVsPrivate: "Public and private pensions use the same subtraction; Connecticut teachers’ pensions have an alternative 50% subtraction.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "Traditional IRA withdrawals are 100% exempt for 2026 under the same income limits as pensions.",
      detail:
        "The traditional (not Roth) IRA subtraction was 75% for 2025 and is 100% for 2026 and later, with the same AGI thresholds and phase-out as pensions. 401(k), 403(b) and 457(b) payouts already get 100%, subject to the phase-out.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt at any income." },
    relief: {
      level: "large",
      incomeLimited: true,
      headline: "100% of pension and IRA income is exempt below $75,000 of AGI ($100,000 joint), phasing out to zero at $100,000 ($150,000 joint).",
    },
    rates: {
      type: "graduated",
      topRate: 6.99,
      brackets: [
        { over: 0, overJoint: 0, rate: 2 },
        { over: 10000, overJoint: 20000, rate: 4.5 },
        { over: 50000, overJoint: 100000, rate: 5.5 },
        { over: 100000, overJoint: 200000, rate: 6 },
        { over: 200000, overJoint: 400000, rate: 6.5 },
        { over: 250000, overJoint: 500000, rate: 6.9 },
        { over: 500000, overJoint: 1000000, rate: 6.99 },
      ],
      summary:
        "Seven brackets from 2% to 6.99%; the 6.99% rate applies above $500,000 single or $1,000,000 joint. We found no enacted change for 2026. At higher incomes Connecticut also recaptures the benefit of the lower brackets and phases out the personal exemption and credits.",
    },
    deductions: "Connecticut has no standard deduction. The personal exemption and personal tax credit phase out with income; the credit is zero above $64,500 single or $100,500 joint.",
    seniorBreaks:
      "The Social Security, pension, IRA and teachers’ pension subtractions above, and a property tax credit of up to $300 per return (income limits apply). Connecticut starts from federal AGI, so the federal $6,000 senior deduction does not reduce Connecticut tax.",
    changes:
      "The IRA subtraction reaches 100% in 2026. A 2026 bill (SB 510) proposed a 1.75% surcharge on capital gains for incomes over $1 million ($2 million joint) starting in 2027; we found no sign it was enacted but could not confirm its final status in an official record.",
    highlights: [
      "Military retirement pay is fully exempt at any income.",
      "Social Security is exempt below $75,000 AGI ($100,000 joint); above that, no more than 25% is taxed.",
      "For 2026, 100% of pension and IRA income is exempt below the same limits.",
      "The pension/IRA break phases out completely at $100,000 single or $150,000 joint.",
      "Rates run from 2% to 6.99%, with no standard deduction.",
    ],
    metaDescription:
      "Connecticut exempts Social Security, pensions and IRA income below $75,000 AGI ($100,000 joint), phasing out above. Military pay is exempt. Full 2026 rules.",
    faqExtra: [
      {
        q: "What happens to Connecticut’s retirement breaks if my income is higher?",
        a: "Above $75,000 of federal AGI ($100,000 joint), no more than 25% of Social Security is taxed, and the pension and IRA subtraction shrinks by table until it disappears at $100,000 single or $150,000 joint. Military retirement pay stays fully exempt at any income.",
      },
    ],
    sources: [
      { label: "Connecticut DRS — 2025 CT-1040 instructions", url: "https://portal.ct.gov/-/media/drs/forms/2025/income/2025-ct-1040-instructions_1225.pdf" },
      { label: "Connecticut DRS — Tax information for seniors (DRS-162)", url: "https://portal.ct.gov/-/media/drs/publications/drs/drs-162-seniors-flyer_0425.pdf?rev=6bf0f860fd0f47d0ba5908c7b45c8ca3&hash=8B33E40549E6B17F53557CDE0C309D6E" },
      { label: "Connecticut DRS — Federally taxable Social Security", url: "https://portal.ct.gov/DRS/Individuals/Individual-Tax-Page/Federally-Taxable-Social-Security" },
      { label: "Connecticut General Assembly — SB 510 fiscal note (2026)", url: "https://www.cga.ct.gov/2026/fc/pdf/2026SB-00510-R000697-FC.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["SB 510’s final status (a capital gains surcharge from 2027) could not be confirmed in a primary source."],
  },
  {
    code: "DE",
    name: "Delaware",
    slug: "delaware",
    taxYear: 2026,
    taxYearNote: "Rules from the 2025 PIT-RES instructions and the Delaware Code as amended by SB 219 of 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Delaware does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement benefits are not taxable in Delaware, with no age or income test.",
    },
    pensions: {
      taxed: "partially",
      summary: "At 60 or older, up to $12,500 per person of pension and other retirement income is excluded; under 60, up to $2,000 of pension.",
      detail:
        "Under 60, up to $2,000 of employer or government pension income is excluded. At 60 or older (by December 31), up to $12,500 per person is excluded, covering pensions plus “eligible retirement income” — IRAs, 401(k)s, government deferred compensation, dividends, capital gains, interest and net rental income. Penalized early distributions do not qualify.",
      publicVsPrivate: "Public and private pensions share the same exclusion.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "At 60+, IRA and 401(k) withdrawals count toward the same $12,500 exclusion.",
      detail: "IRA, 401(k) and 457 distributions count toward the $12,500 exclusion at 60 or older, together with pensions and investment income. Under 60, IRA withdrawals are not excludable.",
    },
    military: {
      taxed: "partially",
      summary: "Through 2026, retirees under 60 can exclude up to $12,500 of military pension; at 60+ it counts toward the general $12,500 exclusion. SB 219 raises the military cap to $15,000 in 2027, $20,000 in 2028 and $25,000 from 2029, at any age (filers 60+ take the larger of the two).",
    },
    relief: { level: "moderate", headline: "Up to $12,500 per person of pension, IRA and investment income is excluded at 60+." },
    rates: {
      type: "graduated",
      topRate: 6.6,
      brackets: [
        { over: 0, overJoint: 0, rate: 0 },
        { over: 2000, overJoint: 2000, rate: 2.2 },
        { over: 5000, overJoint: 5000, rate: 3.9 },
        { over: 10000, overJoint: 10000, rate: 4.8 },
        { over: 20000, overJoint: 20000, rate: 5.2 },
        { over: 25000, overJoint: 25000, rate: 5.55 },
        { over: 60000, overJoint: 60000, rate: 6.6 },
      ],
      summary: "Seven brackets, the same for every filing status and unchanged since 2014: 0% on the first $2,000, then 2.2% rising to 6.6% on taxable income over $60,000.",
    },
    deductions:
      "Standard deduction: $3,250 single, head of household or married filing separately; $6,500 joint. Add $2,500 for each person 65 or older or blind ($5,000 if both). Personal credit: $110 per person.",
    seniorBreaks:
      "An extra $110 personal credit for each filer 60 or older; the extra $2,500 standard deduction at 65+; the $12,500 retirement exclusion at 60+; and a low-income exclusion for people over 60 or disabled — $2,000 ($4,000 joint) if earned income is under $2,500 ($5,000 joint) and AGI is $10,000 or less ($20,000 joint).",
    changes:
      "SB 219, signed August 17, 2026, raises the military pension cap ($15,000 in 2027, $20,000 in 2028, $25,000 from 2029). It also adds a residency (domicile) test for people 60+ claiming the pension exclusion: at least 3 years in Delaware, or 5 years if you became a Delaware resident on or after January 1, 2027. The law does not say which tax year the residency test starts; watch for Division of Revenue guidance.",
    highlights: [
      "Social Security is fully exempt.",
      "At 60+, up to $12,500 per person of pension, IRA and investment income is excluded.",
      "Extra $2,500 standard deduction at 65+ and an extra $110 credit at 60+.",
      "Military pension cap rises to $25,000 by 2029 (SB 219).",
      "New residency test for the pension exclusion — start year not yet stated.",
    ],
    metaDescription:
      "Delaware exempts Social Security and excludes up to $12,500 per person of pension and IRA income at 60+. 2026 rates, senior credits and a new residency test.",
    faqExtra: [
      {
        q: "Do I have to live in Delaware for a while to get the pension exclusion?",
        a: "SB 219 (signed August 17, 2026) adds a domicile test for people 60 or older: at least 3 years in Delaware, or 5 years if you became a resident on or after January 1, 2027. The law doesn’t state which tax year the test starts, so check the Division of Revenue’s guidance before you file.",
      },
    ],
    sources: [
      { label: "Delaware Division of Revenue — 2025 PIT-RES instructions", url: "https://revenuefiles.delaware.gov/2025/PITForms_Instructions/Instructions/PIT-RES_Instructions_2025-01.pdf" },
      { label: "Delaware Code — Title 30, Chapter 11, Subchapter II (exclusions)", url: "https://delcode.delaware.gov/title30/c011/sc02/index.html" },
      { label: "Delaware Code — Title 30, Chapter 11, Subchapter I (rates)", url: "https://delcode.delaware.gov/title30/c011/sc01/index.html" },
      { label: "Delaware Division of Revenue — Personal income tax FAQs", url: "https://revenue.delaware.gov/frequently-asked-questions/personal-income-tax-faqs/" },
      { label: "Delaware General Assembly — SB 219 (2026)", url: "https://legis.delaware.gov/BillDetail/142742" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["SB 219’s new domicile test has no stated start year; reports say 2027, but the codified text could reach 2026."],
  },
  {
    code: "DC",
    name: "District of Columbia",
    short: "DC",
    slug: "district-of-columbia",
    taxYear: 2026,
    taxYearNote: "Rules from the 2025 D-40 booklet (rev. 08/2026); the 2026 standard deduction comes from the 2026 D-40ES worksheet and is provisional.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "DC does not tax Social Security benefits.",
      detail: "Taxable Social Security and Tier 1 Railroad Retirement benefits are subtracted on Form D-40, with no age or income test.",
    },
    pensions: {
      taxed: "yes",
      summary: "Pensions are fully taxable, public or private.",
      detail:
        "DC’s old $3,000 exclusion for DC and federal government pensions (and military pay) at 62+ ended after 2014. The only remaining break is an exclusion for DC or federal government survivor benefits received by survivors 62 or older.",
      publicVsPrivate: "Treated the same: taxable.",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable.", detail: "They are taxed as included in federal AGI; DC has no retirement exclusion." },
    military: { taxed: "yes", summary: "Military retirement pay is taxable; DC’s former $3,000 exclusion ended after 2014." },
    relief: { level: "none", headline: "No retirement income exclusion." },
    rates: {
      type: "graduated",
      topRate: 10.75,
      brackets: [
        { over: 0, overJoint: 0, rate: 4 },
        { over: 10000, overJoint: 10000, rate: 6 },
        { over: 40000, overJoint: 40000, rate: 6.5 },
        { over: 60000, overJoint: 60000, rate: 8.5 },
        { over: 250000, overJoint: 250000, rate: 9.25 },
        { over: 500000, overJoint: 500000, rate: 9.75 },
        { over: 1000000, overJoint: 1000000, rate: 10.75 },
      ],
      summary: "Seven brackets, the same for every filing status: 4% on the first $10,000, rising to 8.5% from $60,000, 9.25% from $250,000, 9.75% from $500,000 and 10.75% over $1 million.",
    },
    deductions:
      "For 2025 DC set its own standard deduction: $15,000 single or married filing separately, $22,500 head of household, $30,000 joint, plus $1,600 for 65+ or blind ($2,000 if single or head of household). For 2026, DC’s estimated-tax worksheet uses $16,100 / $24,150 / $32,200, with $1,650 extra ($2,050 if unmarried) — treat these as provisional until the 2026 D-40 booklet.",
    seniorBreaks:
      "The extra standard deduction at 65+. DC does not allow the federal $6,000 senior deduction. The Schedule H property tax credit pays up to $1,425, with an income limit of $90,000 for claimants 70 and older ($66,000 under 70). Survivors 62+ can exclude DC or federal government survivor benefits.",
    changes:
      "Emergency Act 26-214 (November 2025) and Temporary Law 26-89 (effective February 12, 2026) decoupled DC from the federal standard deduction, the tips, overtime and car-loan deductions and the senior deduction, and made out-of-state municipal bond interest taxable from 2025. The temporary law runs 225 days; whether it was made permanent is not confirmed.",
    highlights: [
      "Social Security is fully exempt.",
      "Pensions, IRA withdrawals and military retirement pay are fully taxable.",
      "Rates run from 4% to 10.75% — one table for all filers.",
      "DC does not allow the federal $6,000 senior deduction.",
      "Property tax credit up to $1,425, with a higher income limit at 70+.",
    ],
    metaDescription:
      "DC exempts Social Security but fully taxes pensions, IRA withdrawals and military pay at 4% to 10.75%. See 2026 deductions, the property tax credit and sources.",
    sources: [
      { label: "DC Office of Tax and Revenue — 2025 D-40 booklet", url: "https://otr.cfo.dc.gov/sites/default/files/dc/sites/otr/publication/attachments/2025_D40_Book_082026_v1.pdf" },
      { label: "DC Office of Tax and Revenue — 2025 D-40 booklet page", url: "https://otr.cfo.dc.gov/publication/2025-d-40-booklet" },
      { label: "DC Office of Tax and Revenue — 2026 D-40ES estimated tax booklet", url: "https://otr.cfo.dc.gov/sites/default/files/dc/sites/otr/publication/attachments/2026_D40ES_Book_wLinks04012026.pdf" },
      { label: "DC Code §47-1803.02 — Gross income exclusions", url: "https://code.dccouncil.gov/us/dc/council/code/sections/47-1803.02" },
      { label: "DC Council — Act 26-214", url: "https://code.dccouncil.gov/us/dc/council/acts/26-214" },
      { label: "DC Council — Law 26-89", url: "https://code.dccouncil.gov/us/dc/council/laws/26-89" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["DC’s 2026 standard deduction depends on whether temporary decoupling legislation was made permanent, so we label the 2026 figures provisional."],
  },
  {
    code: "FL",
    name: "Florida",
    slug: "florida",
    taxYear: 2026,
    taxYearNote: "Florida has no personal income tax.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Florida has no personal income tax, so Social Security is not taxed.",
      detail: "The Florida Constitution bars an income tax on residents, and the Department of Revenue confirms there are no personal income tax filing requirements.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed — Florida has no personal income tax.", detail: "Public and private pensions owe no state income tax." },
    iraAnd401k: { taxed: "no", summary: "IRA and 401(k) withdrawals are not taxed.", detail: "With no personal income tax, withdrawals and required minimum distributions owe no state tax." },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No personal income tax, so every kind of retirement income is untaxed by the state." },
    rates: { type: "none", topRate: 0, summary: "No personal income tax and no capital gains tax for individuals. Florida’s corporate income tax applies only to businesses." },
    deductions: "Not applicable — there is no personal income tax.",
    seniorBreaks: "Not applicable to income tax. Senior homestead property tax exemptions are set locally and are not covered here.",
    changes: "None for individual income tax — the state constitution prohibits one.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "The state constitution bars a personal income tax.",
      "No capital gains tax for individuals.",
      "No state personal income tax return to file.",
    ],
    noTaxNote: "The state constitution bars a personal income tax, and individuals pay no capital gains tax.",
    metaDescription:
      "Florida has no personal income tax — Social Security, pensions, IRA and 401(k) withdrawals and military pay are untaxed, and there is no state return to file.",
    sources: [
      { label: "Florida Department of Revenue — FAQ: personal income tax", url: "https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1466" },
      { label: "Florida Department of Revenue — Florida’s tax brochure (GT-800025)", url: "https://floridarevenue.com/Forms_library/current/brochure/gt800025.pdf" },
      { label: "Florida Department of Revenue — FAQ: capital gains", url: "https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1307&IsDlg=1" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "GA",
    name: "Georgia",
    slug: "georgia",
    taxYear: 2026,
    taxYearNote: "HB 463 (signed May 11, 2026) set the 2026 rate retroactive to January 1; exclusion rules come from the 2025 IT-511 booklet.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Georgia does not tax Social Security benefits.",
      detail: "Taxable Social Security and Railroad Retirement benefits are exempt from Georgia income tax, with no age or income test.",
    },
    pensions: {
      taxed: "partially",
      summary: "Up to $65,000 per person of retirement income is excluded at 65+ ($35,000 at 62–64).",
      detail:
        "The retirement income exclusion covers pensions, annuities, interest, dividends, net rental income, capital gains, royalties and up to $5,000 of earned income. It is $35,000 per person at 62–64 (or if permanently disabled under 62) and $65,000 per person at 65 or older, with no income limit. Each spouse qualifies separately. The 65+ amount rises to $70,000 from 2027.",
      publicVsPrivate: "Public and private pensions share the same exclusion.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "Taxable IRA and 401(k) withdrawals count toward the same $35,000 / $65,000 exclusion.",
      detail: "Taxable IRA distributions are part of the exclusion worksheet (Schedule 1). Anything above your exclusion is taxed at the flat rate.",
    },
    military: {
      taxed: "partially",
      summary:
        "Under 62, up to $17,500 of military retirement pay is excluded, plus another $17,500 if you have more than $17,500 of Georgia earned income. At 62+, it falls under the general $35,000 / $65,000 exclusion.",
    },
    relief: { level: "large", headline: "Up to $65,000 per person of retirement income — pensions, IRAs, interest and more — is excluded at 65+ ($70,000 from 2027)." },
    rates: {
      type: "flat",
      topRate: 4.99,
      flatRate: 4.99,
      summary:
        "A flat 4.99% for 2026, down from 5.19% in 2025. Under HB 463 the rate is scheduled to drop 0.125 point a year from 2027 until it reaches 3.99%, but each step happens only if state revenue tests are met, so the 2027 rate (4.865% with no delay) is a projection.",
    },
    deductions:
      "2026 standard deduction: $15,000 single, head of household or married filing separately; $30,000 joint (up from $12,000 / $24,000). It is scheduled to rise $375 / $750 a year from 2027 to $18,000 / $36,000, subject to the same revenue tests. Dependent exemption: $5,000. There is no extra standard deduction for age.",
    seniorBreaks:
      "The retirement income exclusion is the big one. Georgia has not adopted the federal $6,000 senior deduction — it says it has not adopted the One Big Beautiful Bill Act changes. A low-income credit also exists.",
    changes:
      "HB 463 (signed May 11, 2026): a 4.99% rate for 2026 and trigger-based cuts toward 3.99%; a higher standard deduction and dependent exemption; the 65+ retirement exclusion rises to $70,000 from 2027; and new exclusions of up to $1,750 of overtime and $1,750 of cash tips for 2026–2028.",
    highlights: [
      "Social Security is fully exempt.",
      "Up to $65,000 per person of retirement income excluded at 65+ — rising to $70,000 in 2027.",
      "The exclusion covers pensions, IRAs, interest, dividends and capital gains alike.",
      "Each spouse 65+ gets their own exclusion, with no income limit.",
      "Flat 4.99% rate for 2026, scheduled to keep falling if revenue allows.",
    ],
    metaDescription:
      "Georgia exempts Social Security and excludes up to $65,000 per person of pension and IRA income at 65+ ($70,000 in 2027). Flat 4.99% rate. 2026 rules, sources.",
    faqExtra: [
      {
        q: "Is Georgia’s retirement exclusion going up?",
        a: "Yes. HB 463 raises the exclusion for people 65 and older from $65,000 to $70,000 per person starting with tax year 2027. The $35,000 exclusion for ages 62–64 is unchanged. There is no income limit, and each spouse qualifies separately.",
      },
    ],
    sources: [
      { label: "Office of the Governor — HB 463 (2026) signed legislation", url: "https://gov.georgia.gov/document/2026-signed-legislation/hb-463/download" },
      { label: "Office of the Governor — May 11, 2026 tax bill signing release", url: "https://gov.georgia.gov/press-releases/2026-05-11/gov-kemp-signs-legislation-lowering-taxes-and-supporting-economic-growth" },
      { label: "Georgia Department of Revenue — Important tax updates", url: "https://dor.georgia.gov/taxes/important-tax-updates" },
      { label: "Georgia Department of Revenue — 2025 IT-511 booklet", url: "https://dor.georgia.gov/document/document/2025-it-511-individual-income-tax-booklet/download" },
      { label: "Georgia Department of Revenue — Retirement income exclusion", url: "https://dor.georgia.gov/retirement-income-exclusion" },
      { label: "Georgia Department of Revenue — Retirees FAQ", url: "https://dor.georgia.gov/retirees-faq" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "HI",
    name: "Hawaii",
    slug: "hawaii",
    taxYear: 2026,
    taxYearNote: "Rates and the 2026 standard deduction come from the Hawaii Revised Statutes; exclusions from the 2025 N-11 instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Hawaii does not tax Social Security benefits.",
      detail: "Social Security and first-tier Railroad Retirement benefits are fully exempt.",
    },
    pensions: {
      taxed: "no",
      summary: "Employer-funded pensions, public or private, are not taxed.",
      detail:
        "Hawaii does not tax qualifying distributions from employer-funded pension plans. Public plans (federal civil service, military, state or county) are exempt unless you made voluntary elective contributions. Private plans are exempt if you did not contribute; if you did, the part from your own contributions is taxed (Schedule J). Payments must be for retirement, disability or death — required minimum distributions at 73 qualify, but early distributions hit with the 10% federal penalty are taxable.",
      publicVsPrivate: "Both are exempt when employer-funded; the share you funded yourself is taxable.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA withdrawals are taxed; in 401(k)-type plans only the part from your own salary deferrals is taxed.",
      detail:
        "Hawaii treats IRAs and self-funded annuities as your own investments, so their distributions are taxable. In 401(k), 457, TSP and SARSEP plans, the employee-deferral portion is taxable, while employer-contribution portions paid at retirement are excludable. A rollover IRA keeps the character of the plan it came from.",
    },
    military: { taxed: "no", summary: "Military pensions are fully exempt, like other employer-funded public pensions." },
    relief: { level: "large", headline: "All employer-funded pensions — public and private — are exempt at any age." },
    rates: {
      type: "graduated",
      topRate: 11,
      brackets: [
        { over: 0, overJoint: 0, rate: 1.4 },
        { over: 9600, overJoint: 19200, rate: 3.2 },
        { over: 14400, overJoint: 28800, rate: 5.5 },
        { over: 19200, overJoint: 38400, rate: 6.4 },
        { over: 24000, overJoint: 48000, rate: 6.8 },
        { over: 36000, overJoint: 72000, rate: 7.2 },
        { over: 48000, overJoint: 96000, rate: 7.6 },
        { over: 125000, overJoint: 250000, rate: 7.9 },
        { over: 175000, overJoint: 350000, rate: 8.25 },
        { over: 225000, overJoint: 450000, rate: 9 },
        { over: 275000, overJoint: 550000, rate: 10 },
        { over: 325000, overJoint: 650000, rate: 11 },
      ],
      summary:
        "Twelve brackets from 1.4% to 11% for 2025–2026; the 11% rate applies above $325,000 single or $650,000 joint. Brackets widen again in 2027 and 2029 (for 2027 the 11% rate starts above $400,000 single, $800,000 joint).",
    },
    deductions:
      "The standard deduction nearly doubles in 2026: $8,000 single, $16,000 joint, $12,000 head of household (2025: $4,400 / $8,800 / $6,424). It rises to $9,000 / $18,000 / $13,500 in 2028–29, $10,000 / $20,000 / $15,000 in 2030 and $12,000 / $24,000 / $18,000 from 2031. Personal exemption: $1,144 per person.",
    seniorBreaks:
      "Each filer 65 or older gets an additional $1,144 personal exemption. The pension exclusion has no age requirement. Hawaii uses its own standard deduction; we could not confirm whether it allows the federal $6,000 senior deduction.",
    changes:
      "Act 46 (2024), already in law: the standard deduction rises to $8,000 / $16,000 in 2026 and keeps stepping up through 2031, and the brackets widen in 2027 and 2029. A 2024 proposal to limit the pension exclusion to Hawaii service was not found enacted.",
    highlights: [
      "Social Security and military pensions are fully exempt.",
      "Employer-funded pensions — public or private — are not taxed at any age.",
      "IRA withdrawals and your own 401(k) deferrals are taxed.",
      "Standard deduction jumps to $8,000 single / $16,000 joint in 2026.",
      "Top rate 11%, reached above $325,000 single in 2026.",
    ],
    metaDescription:
      "Hawaii exempts Social Security and employer-funded pensions but taxes IRA withdrawals at 1.4% to 11%. See the larger 2026 standard deduction and senior breaks.",
    sources: [
      { label: "Hawaii Department of Taxation — 2025 Form N-11 instructions", url: "https://files.hawaii.gov/tax/forms/2025/n11ins.pdf" },
      { label: "Hawaii Revised Statutes §235-51 — Tax rates", url: "https://data.capitol.hawaii.gov/hrscurrent/Vol04_Ch0201-0257/HRS0235/HRS_0235-0051.htm" },
      { label: "Hawaii Revised Statutes §235-2.4 — Standard deduction", url: "https://data.capitol.hawaii.gov/hrscurrent/Vol04_Ch0201-0257/HRS0235/HRS_0235-0002_0004.htm" },
      { label: "Hawaii Department of Taxation — 2025 tax table", url: "https://tax.hawaii.gov/forms/d_25table-on/d_25table-on_p13/" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Hawaii’s tax department has not said whether the federal $6,000 senior deduction applies; we do not count it."],
  },
  {
    code: "ID",
    name: "Idaho",
    slug: "idaho",
    taxYear: 2026,
    taxYearNote: "The 5.3% rate is unchanged for 2026; the 2026 indexed amounts (zero bracket, retirement deduction cap) are not yet published.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Idaho does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement benefits are not taxable in Idaho, even when part is taxable on your federal return.",
    },
    pensions: {
      taxed: "yes",
      summary: "Most pensions are taxed; only certain federal, Idaho police and firefighter, and military pensions get a deduction at 65+.",
      detail:
        "The Idaho Retirement Benefits Deduction (Form 39R) covers federal civil service pensions under CSRS/FSRDS (not FERS), the Idaho firefighters’ fund, certain Idaho police funds and military retirement. You must be 65 or older, or disabled and 62+. The 2025 maximum was $48,216 single and $72,324 joint, reduced by the Social Security and Railroad Retirement benefits you received; the 2026 maximum is not yet published. Private pensions and other states’ pensions do not qualify.",
      publicVsPrivate: "Only the listed public plans qualify for the deduction; private and other-state pensions are fully taxable.",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable.", detail: "They do not qualify for the Retirement Benefits Deduction." },
    military: {
      taxed: "partially",
      summary:
        "Military retirement qualifies for the Retirement Benefits Deduction (capped and reduced by Social Security). From 2025 you qualify if disabled, 62 or older, or under 62 and working with income high enough to require a federal return.",
    },
    relief: { level: "narrow", headline: "A large deduction exists only for specific public pensions (CSRS, Idaho police and fire, military), reduced by Social Security." },
    rates: {
      type: "flat",
      topRate: 5.3,
      flatRate: 5.3,
      summary:
        "A flat 5.3% on taxable income above a zero bracket — $4,811 single and $9,622 joint in 2025. The 2026 zero-bracket amount is indexed and not yet published. No 2026 rate change was enacted.",
    },
    deductions:
      "Idaho uses the federal standard deduction (it conforms to the federal tax code as of January 1, 2026), including the federal extra amount for 65+ or blind — $1,600 per box, or $2,000 if single or head of household, in 2025.",
    seniorBreaks:
      "Idaho allows the federal $6,000 enhanced senior deduction (2025–2028). The Retirement Benefits Deduction applies at 65+ (62+ if disabled). The Food Tax Credit was $155 per person for 2025; people 65+ who don’t have to file can claim it on Form 24.",
    changes:
      "HB 559 (signed February 10, 2026, retroactive to January 1, 2025) brought in the bigger federal standard deduction, the senior deduction and the tips, overtime and car-loan deductions. The 5.3% rate dates from 2025 (HB 40). 2026 bills to cut the rate (H0589) or add a senior food credit (H0605) were not enacted.",
    highlights: [
      "Social Security is fully exempt.",
      "Flat 5.3% rate above a zero bracket.",
      "Private pensions and IRA/401(k) withdrawals are fully taxable.",
      "A large deduction covers only CSRS, Idaho police/fire and military pensions at 65+.",
      "Idaho allows the federal $6,000 senior deduction for 2025–2028.",
    ],
    metaDescription:
      "Idaho exempts Social Security but taxes IRA withdrawals and most pensions at a flat 5.3%; only some public pensions get a deduction. 2026 rules and sources.",
    sources: [
      { label: "Idaho State Tax Commission — Form 40 instructions (EIN00046, rev. 03-02-2026)", url: "https://tax.idaho.gov/wp-content/uploads/forms/EIN00046/EIN00046_03-02-2026.pdf" },
      { label: "Idaho State Tax Commission — What’s new for 2025 income tax returns", url: "https://tax.idaho.gov/pressrelease/whats-new-for-2025-income-tax-returns/" },
      { label: "Idaho State Tax Commission — Filing 2025 taxes now that conformity is law", url: "https://tax.idaho.gov/pressrelease/update-on-filing-2025-idaho-income-taxes-now-that-conformity-is-law/" },
      { label: "Idaho State Tax Commission — Guidance for seniors and retirees", url: "https://tax.idaho.gov/taxes/income-tax/individual-income/specific-guidance-for-individual-income-tax/specific-guidance-for-individuals-seniors-and-retirees/" },
      { label: "Idaho State Tax Commission — Idaho Retirement Benefits Deduction", url: "https://tax.idaho.gov/taxes/income-tax/individual-income/popular-credits-and-deductions/idaho-retirement-benefits-deduction/" },
      { label: "Idaho State Tax Commission — Form 39R", url: "https://tax.idaho.gov/document-mngr/forms_EFO00088/" },
      { label: "Idaho State Tax Commission — Food Tax Credit", url: "https://tax.idaho.gov/pressrelease/claim-your-food-tax-credit-even-if-you-dont-earn-enough-to-file-income-taxes/" },
      { label: "Idaho Legislature — H0589 (2026)", url: "https://legislature.idaho.gov/sessioninfo/2026/legislation/H0589/" },
    ],
    confidence: "medium",
    lastVerified: V,
    notes: ["Idaho’s 2026 Retirement Benefits Deduction maximum and 2026 zero bracket are recalculated each year and not yet published; we show 2025 amounts."],
  },
];
