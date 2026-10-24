/**
 * Illinois – Missouri. Facts: docs/research/states_b.json, checked against docs/research/verify_states_b.json.
 * Verifier corrections applied: LA $12,000 senior exclusion applies from 2025 (not $6,000). Verifier-supplied
 * missing items used: IA health-premium deduction, KY FY2026 trigger letter, MA base exemptions, MI homestead
 * credit maximum, MS head-of-family amounts, MD 2026 bill outcomes.
 */
import type { StateTaxInput } from "./types";

const V = "2026-10-23" as const;

export const STATES_B: StateTaxInput[] = [
  {
    code: "IL",
    name: "Illinois",
    slug: "illinois",
    taxYear: 2026,
    taxYearNote: "The 4.95% rate has applied since July 1, 2017; the 2026 exemption amount is published.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Illinois does not tax Social Security benefits.",
      detail: "Federally taxed Social Security and Railroad Retirement benefits are fully subtracted on Form IL-1040, with no age or income test.",
    },
    pensions: {
      taxed: "no",
      summary: "Pensions are fully exempt — public, private and military.",
      detail:
        "Illinois subtracts the federally taxable part of qualified employee benefit plans (pensions and 401(k)s), government retirement and disability plans including military, state and local 457 plans and Railroad Retirement — with no dollar cap and no age requirement. Early distributions qualify too. Non-government deferred compensation plans generally do not.",
      publicVsPrivate: "Treated the same: both exempt.",
    },
    iraAnd401k: {
      taxed: "no",
      summary: "IRA and 401(k) withdrawals are fully exempt.",
      detail: "IRA distributions (including amounts converted to a Roth IRA), SEP plans and 401(k) distributions are fully subtracted at any age.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt." },
    relief: { level: "all", headline: "All pension, IRA and 401(k) income is exempt at any age." },
    rates: { type: "flat", topRate: 4.95, flatRate: 4.95, summary: "A flat 4.95% on net income — unchanged since July 1, 2017." },
    deductions:
      "No standard deduction. The exemption allowance is $2,925 per person for 2026 ($2,850 for 2025), plus $1,000 more for each filer 65+ or blind. No exemption allowance if federal AGI is over $250,000 ($500,000 joint).",
    seniorBreaks: "An extra $1,000 exemption for each filer 65 or older (or blind), on top of the full retirement income subtraction.",
    changes: "We found no enacted 2025–2028 change to how Illinois taxes retirees. The exemption allowance is indexed each year; the 2027 amount is not yet announced.",
    highlights: [
      "Social Security, pensions, IRAs and 401(k)s are all exempt — at any age.",
      "Even early retirement-plan distributions are subtracted.",
      "Flat 4.95% on other income such as wages, interest and capital gains.",
      "Extra $1,000 exemption at 65+.",
      "No exemption allowance above $250,000 of AGI ($500,000 joint).",
    ],
    metaDescription:
      "Illinois exempts Social Security, pensions, IRA and 401(k) withdrawals and military pay at any age. Other income pays a flat 4.95%. 2026 exemptions and sources.",
    sources: [
      { label: "Illinois Department of Revenue — Pension and retirement income", url: "https://tax.illinois.gov/individuals/pension.html" },
      { label: "Illinois Department of Revenue — Publication 120, Retirement income", url: "https://tax.illinois.gov/research/publications/pubs/retirement-income.html" },
      { label: "Illinois Department of Revenue — Exemption allowance amounts", url: "https://tax.illinois.gov/questionsandanswers/answer.851.html" },
      { label: "Illinois Department of Revenue — Income tax rates", url: "https://tax.illinois.gov/research/taxrates/income.html" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "IN",
    name: "Indiana",
    slug: "indiana",
    taxYear: 2026,
    taxYearNote: "State rates for 2026 and 2027 are published by the Department of Revenue; county rates as of October 1, 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Indiana does not tax Social Security benefits.",
      detail: "Indiana deducts any Social Security or Railroad Retirement benefits included in federal AGI, with no age or income limit.",
    },
    pensions: {
      taxed: "yes",
      summary: "Pensions are taxed (state rate plus county tax); only federal civil service annuities get a deduction at 62+.",
      detail:
        "Indiana has no general pension or retirement exclusion. The federal civil service annuity deduction allows up to $16,000 at age 62 or older (a surviving spouse qualifies at any age), minus the Social Security and Railroad Retirement benefits you received. A separate disability retirement deduction also exists.",
      publicVsPrivate: "Private pensions are fully taxable; federal civil service annuities get the $16,000 deduction (minus Social Security).",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable.", detail: "There is no age-based retirement exclusion." },
    military: {
      taxed: "no",
      summary: "Military retirement pay is 100% deductible since 2022, at any age, including survivor benefits; Space Force, Public Health Service and NOAA Corps retirees were added in 2025.",
    },
    relief: { level: "narrow", headline: "Only federal civil service annuities get a deduction — up to $16,000 at 62+, minus Social Security." },
    rates: {
      type: "flat",
      topRate: 2.95,
      flatRate: 2.95,
      summary:
        "A flat 2.95% state rate for 2026 (3.00% in 2025), dropping to 2.90% in 2027. Every county adds its own local income tax — from 0.5% (Porter) to 3.0% (Randolph) as of October 1, 2026. A 2025 law (SEA 451) allows further cuts from 2030 if revenue conditions are met.",
    },
    deductions:
      "No standard deduction. Personal exemption: $1,000 per person, plus $1,000 for each filer 65+ and $1,000 if blind. Another $500 per person 65+ if federal AGI is under $40,000 ($20,000 married filing separately).",
    seniorBreaks:
      "The extra $1,000 (and possibly $500) exemptions at 65+. The Unified Tax Credit for the Elderly, for people 65+ with federal AGI under $10,000: $100, $50 or $40 for a single filer (up to $140 when both spouses are 65+). The civil service annuity deduction at 62+.",
    changes:
      "The state rate falls to 2.95% in 2026 and 2.90% in 2027. SEA 451 (2025, Public Law 80) allows further rate cuts from 2030 if conditions are met. County rates can change each January and October.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Pensions and IRA/401(k) withdrawals are taxed at 2.95% plus county tax.",
      "County income taxes add 0.5% to 3.0% depending on where you live.",
      "Extra exemptions at 65+, with $500 more each under $40,000 of AGI.",
      "State rate drops to 2.90% in 2027.",
    ],
    metaDescription:
      "Indiana exempts Social Security and military pay but taxes pensions and IRA withdrawals at 2.95% plus county tax of 0.5% to 3%. 2026 rules, credits, sources.",
    sources: [
      { label: "Indiana Department of Revenue — Departmental Notice #1 (county rates)", url: "https://www.in.gov/dor/files/dn01.pdf" },
      { label: "Indiana Department of Revenue — Rates, fees and penalties", url: "https://www.in.gov/dor/resources/tax-rates-and-reports/rates-fees-and-penalties/" },
      { label: "Indiana Department of Revenue — Information Bulletin #6 (retirement deductions)", url: "https://www.in.gov/dor/files/ib06.pdf" },
      { label: "Indiana Department of Revenue — Information Bulletin #26 (Social Security, exemptions)", url: "https://www.in.gov/dor/files/ib26.pdf" },
      { label: "Indiana Department of Revenue — Seniors", url: "https://www.in.gov/dor/i-am-a/individual/seniors/" },
      { label: "Indiana General Assembly — SEA 451 (2025)", url: "https://iga.in.gov/legislative/2025/bills/senate/451/details" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["We could not check every 2026-session bill for retiree changes in Indiana."],
  },
  {
    code: "IA",
    name: "Iowa",
    slug: "iowa",
    taxYear: 2026,
    taxYearNote: "The 2026 rate is official; retirement rules come from the 2025 instructions and are unchanged by law.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Iowa does not tax Social Security benefits.",
      detail: "The taxable amount from your federal return is subtracted, with no income or age limit. Social Security still counts toward Iowa’s filing threshold and alternate-tax calculations.",
    },
    pensions: {
      taxed: "no",
      summary: "At 55 or older, all pension and retirement-plan income is excluded.",
      detail:
        "Since 2023, Iowa fully excludes retirement income from government and other pension or retirement plans — including IPERS, defined-benefit and profit-sharing plans and 457(b) — if you are 55 or older on December 31, disabled, or the surviving spouse or survivor of someone who qualified. On a joint return only the qualifying spouse’s income is excluded. Nonqualified deferred compensation and nonqualified annuities do not qualify.",
      publicVsPrivate: "Treated the same: both excluded at 55+.",
    },
    iraAnd401k: {
      taxed: "no",
      summary: "At 55+, IRA and 401(k) withdrawals are fully excluded.",
      detail:
        "Traditional and Roth IRA, SEP, SIMPLE, 401(k), 403(b) and 457(b) distributions are fully excluded if you meet the 55+, disabled or survivor test; otherwise they are taxed at 3.8%.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully excluded at any age." },
    relief: { level: "all", headline: "All pension, IRA and 401(k) income is excluded once you are 55." },
    rates: { type: "flat", topRate: 3.8, flatRate: 3.8, summary: "A flat 3.8% on all taxable income for 2025 and 2026, and for 2027 under current law." },
    deductions:
      "Iowa starts from federal taxable income, so the federal standard deduction and the federal $6,000 senior deduction (2025–2028) flow through. Personal exemption credit: $40 per filer.",
    seniorBreaks:
      "An extra $20 credit for each filer 65+ (or blind). Higher filing thresholds at 65+: $24,000 single, $32,000 joint. At 65+, if Iowa taxable income is under $100,000, you can deduct 100% of health and dental insurance premiums paid after tax, including Medicare Part B and Part D. An alternate tax calculation often helps filers 65+.",
    changes:
      "No 2026-session change to the rate or the retirement exclusion was found (the 2026 session focused on property tax). Some older Department pages still show a superseded 3.9% rate for 2026; 3.8% is current law.",
    highlights: [
      "Social Security, pensions, IRAs and 401(k)s are all excluded at 55+.",
      "Military retirement pay is excluded at any age.",
      "Flat 3.8% rate on everything else.",
      "The federal $6,000 senior deduction flows through.",
      "At 65+, deduct Medicare and other health premiums if Iowa taxable income is under $100,000.",
    ],
    metaDescription:
      "Iowa exempts Social Security and, from age 55, all pension, IRA and 401(k) income. Flat 3.8% rate on the rest. 2026 senior credits, deductions and sources.",
    sources: [
      { label: "Iowa Department of Revenue — 2026 individual income tax and interest rates", url: "https://revenue.iowa.gov/press-release/2025-10-21/idr-announces-2026-individual-income-tax-and-interest-rates" },
      { label: "Iowa Department of Revenue — Retirement income tax guidance", url: "https://revenue.iowa.gov/taxes/tax-guidance/individual-income-tax/retirement-income-tax-guidance" },
      { label: "Iowa Department of Revenue — IA 1040 Schedule 1 instructions", url: "https://revenue.iowa.gov/taxes/tax-guidance/individual-income-tax/1040-expanded-instructions/ia-1040-schedule-1" },
      { label: "Iowa Department of Revenue — 2025 IA 1040 expanded instructions", url: "https://revenue.iowa.gov/media/4435/download?inline=" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "KS",
    name: "Kansas",
    slug: "kansas",
    taxYear: 2026,
    taxYearNote: "Rates are official for 2026; no automatic rate cut applies for 2026 or 2027.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Kansas does not tax Social Security benefits.",
      detail: "Since 2024 Social Security is fully exempt for everyone; the old $75,000 AGI limit was removed (SB 1, 2024 special session).",
    },
    pensions: {
      taxed: "partially",
      summary: "Public pensions (federal, military, KPERS and other Kansas systems) are exempt; private pensions are taxed.",
      detail:
        "Fully exempt: federal civil service and other federal retirement, military retirement and the Thrift Savings Plan, KPERS, KP&F, Kansas teachers, Highway Patrol, Justices and Judges, Railroad Retirement, Regents and Washburn plans and certain city pensions. Private-employer pensions are fully taxable.",
      publicVsPrivate: "Public pensions exempt; private pensions fully taxable.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are fully taxable.",
      detail: "Kansas has no general retirement exclusion. A narrow subtraction applies only to KPERS lump sums rolled into a qualified account.",
    },
    military: { taxed: "no", summary: "Military retirement pay (including the Thrift Savings Plan) is fully exempt." },
    relief: { level: "moderate", headline: "Public pensions are fully exempt; private pensions and IRAs get no exclusion." },
    rates: {
      type: "graduated",
      topRate: 5.58,
      brackets: [
        { over: 0, overJoint: 0, rate: 5.2 },
        { over: 23000, overJoint: 46000, rate: 5.58 },
      ],
      summary: "Two brackets since 2024: 5.2% on the first $23,000 of taxable income ($46,000 joint) and 5.58% above. The automatic cuts in SB 269 (2025) were not triggered for 2026 or 2027.",
    },
    deductions:
      "Standard deduction: $3,605 single, $8,240 joint, $6,180 head of household, $4,120 married filing separately. At 65+ or blind it rises — $4,455 single with one box; $8,940 joint with one box, $9,640 with two. Personal exemption: $9,160 single, head of household or separate; $18,320 joint; plus $2,320 per dependent.",
    seniorBreaks: "The higher standard deduction at 65+. The Homestead refund pays up to $700 toward property tax, and there is a property tax refund for seniors 65+ (and disabled veterans).",
    changes:
      "SB 269 (2025) cuts rates automatically when revenue beats an inflation-adjusted target and reserves are at least 15%; Notice 26-11 (October 15, 2026) confirms no cut for 2027. The Department’s 2026 legislative summary lists no retiree income-tax changes.",
    highlights: [
      "Social Security is fully exempt for everyone since 2024.",
      "Federal, military and Kansas public pensions are fully exempt.",
      "Private pensions and IRA/401(k) withdrawals are fully taxed.",
      "Rates of 5.2% and 5.58% — no automatic cut for 2026 or 2027.",
      "Higher standard deduction at 65+ and a homestead refund up to $700.",
    ],
    metaDescription:
      "Kansas exempts Social Security, military pay and public pensions like KPERS, but taxes private pensions and IRA withdrawals at 5.2% to 5.58%. 2026 rules.",
    sources: [
      { label: "Kansas Department of Revenue — 2025 K-40 instructions (IP25)", url: "https://www.ksrevenue.gov/pdf/ip25.pdf" },
      { label: "Kansas Department of Revenue — Notice 24-08 (Social Security exemption)", url: "https://www.ksrevenue.gov/taxnotices/notice24-08.pdf" },
      { label: "Kansas Department of Revenue — Notice 25-06 (no rate reduction for 2026)", url: "https://ksrevenue.gov/taxnotices/notice25-06.pdf" },
      { label: "Kansas Department of Revenue — Notice 26-11 (no rate reduction for 2027)", url: "https://www.ksrevenue.gov/taxnotices/notice26-11.pdf" },
      { label: "Kansas Department of Revenue — 2026 legislative changes", url: "https://www.ksrevenue.gov/pdf/2026LegChanges.pdf" },
      { label: "Kansas Department of Revenue — 2026 K-40ES estimated tax", url: "https://www.ksrevenue.gov/pdf/k-40es26.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "KY",
    name: "Kentucky",
    slug: "kentucky",
    taxYear: 2026,
    taxYearNote: "Official for 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Kentucky does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement Board benefits included in income are subtracted on Schedule M, with no age or income limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "Up to $31,110 per person of pension, IRA and other retirement income is excluded, at any age.",
      detail:
        "The exclusion is 100% of taxable retirement benefits or $31,110, whichever is less, per taxpayer, with no age requirement. It covers public and private pensions, annuities, IRAs, 401(k)s, deferred compensation, disability retirement and Roth conversions. Federal, Kentucky state and local government pensions earned through service before January 1, 1998 are fully excludable (Schedule P). The $31,110 is fixed in law, not indexed.",
      publicVsPrivate: "Same $31,110 cap for both; government service before 1998 is fully excludable.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals share the same $31,110-per-person exclusion; the excess is taxed at 3.5%.",
      detail: "Roth conversions are covered by the exclusion too.",
    },
    military: {
      taxed: "partially",
      summary: "Military pensions share the $31,110 exclusion, plus full exclusion of the part tied to service before 1998 — retired military may be able to exclude more than $31,110.",
    },
    relief: { level: "large", headline: "Up to $31,110 per person of pension, IRA and 401(k) income is excluded, at any age." },
    rates: {
      type: "flat",
      topRate: 3.5,
      flatRate: 3.5,
      summary:
        "A flat 3.5% for 2026, down from 4.0% in 2025. Further half-point cuts need budget triggers plus legislative action; the triggers were not met in 2025 or 2026, so 3.5% continues for 2027 and 2028 unless lawmakers change it.",
    },
    deductions: "Standard deduction: $3,360 for 2026 ($3,270 for 2025), indexed. No personal exemption — personal tax credits instead.",
    seniorBreaks: "A $40 personal tax credit for each filer 65+ (another $40 if blind). A family size tax credit helps low-income households; its income limits vary by family size.",
    changes: "HB 1 (2025) set the 3.5% rate for 2026. 2026 bills to raise the pension exclusion to $41,110 (HB 183) or create graduated rates did not advance.",
    highlights: [
      "Social Security is fully exempt.",
      "Up to $31,110 per person of pension, IRA and 401(k) income excluded — no age requirement.",
      "Government pensions for service before 1998 are fully excluded.",
      "Flat 3.5% rate, set to stay through 2028.",
      "Extra $40 credit for each filer 65+.",
    ],
    metaDescription:
      "Kentucky exempts Social Security and excludes up to $31,110 per person of pension, IRA and 401(k) income at any age. Flat 3.5% rate in 2026. Rules and sources.",
    sources: [
      { label: "Kentucky Department of Revenue — 2025 Schedule M", url: "https://revenue.ky.gov/Forms/Schedule%20M%20(2025).pdf" },
      { label: "Kentucky Department of Revenue — 2025 Schedule P", url: "https://revenue.ky.gov/Forms/Schedule%20P%20(2025).pdf" },
      { label: "Kentucky Department of Revenue — Military exemptions", url: "https://revenue.ky.gov/Individual/Pages/Military-Exemptions.aspx" },
      { label: "Kentucky Department of Revenue — 2026 standard deduction announcement", url: "https://revenue.ky.gov/News/Pages/Kentucky-DOR-Announces-2026-Standard-Deduction.aspx" },
      { label: "Kentucky Department of Revenue — 2026 withholding formula", url: "https://revenue.ky.gov/Forms/2026%20Withholding%20Formula.pdf" },
      { label: "Kentucky Department of Revenue — 2025 Schedule ITC", url: "https://revenue.ky.gov/Forms/Schedule%20ITC%20(2025).pdf" },
      { label: "Kentucky Revised Statutes §141.020", url: "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=56339" },
      { label: "Office of State Budget Director — FY2025 income tax reduction review", url: "https://apps.legislature.ky.gov/AgencyReports/IJC/AR/OSBD/ITRC/FY%202025.pdf" },
      { label: "Office of State Budget Director — FY2026 income tax reduction review", url: "https://apps.legislature.ky.gov/AgencyReports/IJC/AR/OSBD/ITRC/FY%202026.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["The family size tax credit’s income limit was not checked against a primary source, so we don’t show a dollar figure."],
  },
  {
    code: "LA",
    name: "Louisiana",
    slug: "louisiana",
    taxYear: 2026,
    taxYearNote: "The flat rate is official; the 2026 standard deduction is provisional; exclusions come from the 2025 IT-540 instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Louisiana does not tax Social Security benefits.",
      detail: "Social Security benefits taxed on your federal return are exempt from Louisiana tax, with no age or income limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "Government pensions (federal, military, Louisiana systems) are exempt; at 65+, up to $12,000 per person of other retirement income is excluded.",
      detail:
        "Fully exempt: the Louisiana State Employees’ and Teachers’ retirement systems, federal retirement (military and civilian) and other systems listed in law (school employees, State Police, municipal, police, fire and others). Other retirement income — private pensions, annuities and IRAs — qualifies for an annual exclusion of up to $12,000 per taxpayer 65 or older; each spouse 65+ with their own retirement income can exclude $12,000. Under 65, private pensions and IRAs are taxable.",
      publicVsPrivate: "Public pensions fully exempt; private pensions get the $12,000 exclusion at 65+.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals are taxable, except up to $12,000 per person 65 or older.",
      detail: "The 65+ exclusion has been $12,000 since tax year 2025 (it was $6,000 through 2024). Distributions before 65 are taxed at 3%.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt as federal retirement, and Survivor Benefit Plan payments are exempt too." },
    relief: { level: "moderate", headline: "Government pensions are fully exempt, and at 65+ another $12,000 per person of private pension or IRA income is excluded." },
    rates: { type: "flat", topRate: 3, flatRate: 3, summary: "A flat 3% since 2025; the old graduated brackets were repealed." },
    deductions:
      "Standard deduction for 2025: $12,500 single or married filing separately; $25,000 joint, head of household or surviving spouse (it absorbs the old personal exemption). It is indexed: Louisiana’s 2026 withholding tables use $12,875 / $25,750, but the Department says the amounts on 2026 returns may differ slightly.",
    seniorBreaks:
      "The $12,000 retirement exclusion at 65+. One Department page still describes a doubled $25,000 senior standard deduction, but that depended on Amendment 2 of March 29, 2025, which news reports say failed — the official 2025 return has no senior add-on.",
    changes:
      "Act 11 (2024 Third Extraordinary Session) set the flat 3% rate, the indexed $12,500 standard deduction and the $12,000 senior retirement exclusion from 2025. HB 667 (2025), which would have cut the rate to 2.75% from 2027, was not enacted.",
    highlights: [
      "Social Security, military pay and government pensions are fully exempt.",
      "At 65+, up to $12,000 per person of private pension or IRA income is excluded.",
      "Flat 3% rate since 2025.",
      "Standard deduction $12,500 single / $25,000 joint (2025), indexed.",
      "No extra senior standard deduction on the 2025 return.",
    ],
    metaDescription:
      "Louisiana exempts Social Security, military and government pensions, and excludes $12,000 of other retirement income at 65+. Flat 3% rate. 2026 rules.",
    sources: [
      { label: "Louisiana Department of Revenue — Individual income tax rates and brackets", url: "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/income-tax-reform/what-are-the-individual-income-tax-rates-and-brackets/" },
      { label: "Louisiana Department of Revenue — 2025 IT-540 instructions", url: "https://dam.ldr.la.gov/taxforms/IT540i-WEB-2025-Revised-7-26.pdf" },
      { label: "Louisiana Department of Revenue — Retirement benefits that may be excluded", url: "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/individual-income-tax/is-there-a-list-of-retirement-system-benefits-that-may-be-excluded-from-louisiana-income-tax/" },
      { label: "Louisiana Department of Revenue — 2026 withholding tables notice", url: "https://dam.ldr.la.gov/lawspolicies/NOI-Withholding%20Tables%20LAC%2061.I.1501.pdf" },
      { label: "Louisiana Department of Revenue — Will the standard deduction change each year?", url: "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/income-tax-reform/will-the-standard-deduction-change-each-year-or-stay-the-same/" },
      { label: "Louisiana Department of Revenue — Constitutional amendment FAQ", url: "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/constitutional-amendment/what-tax-changes-are-made-by-the-amendment/" },
    ],
    confidence: "medium",
    lastVerified: V,
    notes: [
      "We could not retrieve the Secretary of State’s certified result for Amendment 2 (March 2025); the official 2025 return does not apply a senior standard deduction, and neither do we.",
      "We could not confirm that no rate change passed in Louisiana’s 2026 session.",
    ],
  },
  {
    code: "ME",
    name: "Maine",
    slug: "maine",
    taxYear: 2026,
    taxYearNote: "The 2026 rate schedules (revised May 20, 2026) are official.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Maine does not tax Social Security benefits.",
      detail:
        "The taxable amount of Social Security and Railroad Retirement benefits is subtracted, with no age or income test. But the benefits you receive (taxable or not) reduce the pension income deduction cap.",
    },
    pensions: {
      taxed: "partially",
      summary: "Up to $49,824 per person of pension and IRA income is deducted in 2026, minus the Social Security you receive.",
      detail:
        "The pension income deduction has no minimum age, but distributions before 55 that are not substantially equal periodic payments don’t qualify (from September 24, 2025). The cap is $49,824 for 2026 ($48,216 for 2025) and must be reduced by all Social Security and Railroad Retirement benefits received, taxable or not. It covers state and federal pensions, 401(a), 401(k), 403, 457(b), IRAs, Roth IRAs, SEP and SIMPLE plans. From 2025 the deduction phases out as federal AGI rises above $125,000 (single, and married filing separately from 2026), $187,500 (head of household) or $250,000 (joint) — gone $100,000 above the threshold ($50,000 for married filing separately). The 2026 inflation-adjusted thresholds are not yet published.",
      publicVsPrivate: "Same deduction for both.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals count toward the same $49,824 deduction.",
      detail: "Subject to the same cap, Social Security offset and income phase-out. Roth conversions do not qualify.",
    },
    military: {
      taxed: "no",
      summary: "Military retirement pay is fully exempt — no cap, no Social Security offset and no income phase-out. From 2026 this also covers NOAA and Public Health Service retirees.",
    },
    relief: { level: "large", headline: "Up to $49,824 per person of pension and IRA income is deducted in 2026, reduced by the Social Security you receive." },
    rates: {
      type: "graduated",
      topRate: 7.15,
      brackets: [
        { over: 0, overJoint: 0, rate: 5.8 },
        { over: 27400, overJoint: 54850, rate: 6.75 },
        { over: 64850, overJoint: 129750, rate: 7.15 },
      ],
      summary:
        "Three brackets for 2026: 5.8%, 6.75% and 7.15% (7.15% starts at $64,850 single, $129,750 joint, $97,300 head of household). New in 2026: a 2% surcharge on Maine taxable income above $1 million single ($750,000 married filing separately, $1.5 million joint or head of household).",
    },
    deductions:
      "2026 standard deduction: $15,700 single or married filing separately, $23,550 head of household, $31,400 joint, plus $2,050 (unmarried) or $1,650 (married) for each 65+/blind box. Personal exemption: $5,300 each. Both phase out at higher incomes. From 2027 Maine’s standard deduction equals the federal one.",
    seniorBreaks:
      "The extra standard deduction at 65+. The refundable Property Tax Fairness Credit is up to $2,000 for people 65+. Whether Maine passes through the federal $6,000 senior deduction is not confirmed.",
    changes:
      "2025: an income phase-out was added to the pension deduction, and pre-55 non-periodic payouts were excluded. 2026: the 2% surcharge on income over $1 million; the military exemption expanded to NOAA and PHS; the married-filing-separately phase-out aligned at $125,000; a $300 affordability payment. 2027: the standard deduction matches the federal amount and surcharge thresholds are indexed.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Pension and IRA deduction up to $49,824 per person for 2026 — minus Social Security received.",
      "The pension deduction phases out above $125,000 of AGI ($250,000 joint).",
      "Rates of 5.8% to 7.15%, plus a new 2% surcharge above $1 million.",
      "Property Tax Fairness Credit up to $2,000 at 65+.",
    ],
    metaDescription:
      "Maine exempts Social Security and military pay, and deducts up to $49,824 of pension and IRA income in 2026, minus Social Security. Rates 5.8% to 7.15%.",
    sources: [
      { label: "Maine Revenue Services — 2026 individual income tax rate schedules (rev. May 20, 2026)", url: "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/2026-05/ind_tax_rate_sched_2026_rev.pdf" },
      { label: "Maine Revenue Services — 2026 Form 1040ES-ME", url: "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/26_1040es_fillable.pdf" },
      { label: "Maine Revenue Services — 2025 Form 1040ME general instructions", url: "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/25_1040me_gen_instr_w_cover_pg.pdf" },
      { label: "Maine Revenue Services — 2025 legislative changes", url: "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/legischange25.pdf" },
      { label: "Maine Revenue Services — 2026 legislative changes", url: "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/legischange26.pdf" },
      { label: "Maine Revised Statutes 36 §5122 — Modifications", url: "https://legislature.maine.gov/statutes/36/title36sec5122.html" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: [
      "Maine’s 2026 inflation-adjusted phase-out thresholds for the pension deduction are not yet published; we show the 2025 base amounts.",
      "We could not confirm whether the federal $6,000 senior deduction flows into Maine.",
    ],
  },
  {
    code: "MD",
    name: "Maryland",
    slug: "maryland",
    taxYear: 2026,
    taxYearNote: "The 2026 pension exclusion is official; brackets set by 2025 law continue.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Maryland does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement benefits are fully exempt. But the total you receive reduces the pension exclusion.",
    },
    pensions: {
      taxed: "partially",
      summary: "At 65+, up to $40,600 of pension income is excluded in 2026, minus all Social Security received.",
      detail:
        "The pension exclusion is for people 65 or older (or totally disabled, or with a totally disabled spouse) at year-end. It covers pensions and annuities from an employee retirement system — defined-benefit and defined-contribution plans, 401(a), 401(k), 403(b) and 457(b). The maximum is $40,600 for 2026 ($41,200 for 2025), reduced by all Social Security and Railroad Retirement benefits received, not just the taxable part. Retired correctional, law enforcement and fire/rescue/EMS personnel have a separate subtraction, and retired forest, park and wildlife rangers 55+ can exclude up to $15,000.",
      publicVsPrivate: "Same exclusion for both.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "401(k), 403(b) and 457(b) payouts qualify for the pension exclusion; IRA withdrawals are fully taxable.",
      detail: "A traditional IRA, Roth IRA, SEP, Keogh plan or ineligible deferred compensation plan does not qualify, so IRA distributions are taxed at state plus local rates.",
    },
    military: {
      taxed: "partially",
      summary: "Up to $12,500 of military retirement pay is subtracted if you are under 55, or $20,000 at 55+. Amounts not subtracted can use the pension exclusion at 65+.",
    },
    relief: { level: "moderate", headline: "At 65+, up to $40,600 of pension and 401(k) income is excluded in 2026, minus Social Security received — IRAs don’t qualify." },
    rates: {
      type: "graduated",
      topRate: 6.5,
      brackets: [
        { over: 0, overJoint: 0, rate: 2 },
        { over: 1000, overJoint: 1000, rate: 3 },
        { over: 2000, overJoint: 2000, rate: 4 },
        { over: 3000, overJoint: 3000, rate: 4.75 },
        { over: 100000, overJoint: 150000, rate: 5 },
        { over: 125000, overJoint: 175000, rate: 5.25 },
        { over: 150000, overJoint: 225000, rate: 5.5 },
        { over: 250000, overJoint: 300000, rate: 5.75 },
        { over: 500000, overJoint: 600000, rate: 6.25 },
        { over: 1000000, overJoint: 1200000, rate: 6.5 },
      ],
      summary:
        "State rates from 2% to 6.5% (the 6.25% and 6.5% brackets were added for 2025), plus a county or Baltimore City income tax of 2.25% to 3.30%. An extra 2% tax applies to net capital gains when federal AGI is over $350,000.",
    },
    deductions:
      "Standard deduction for 2025: a flat $3,350 single or married filing separately, $6,700 joint or head of household, indexed after that (the 2026 return amounts aren’t published yet). Personal exemption $3,200, phased down above $100,000 of federal AGI ($150,000 joint) and gone above $150,000 ($200,000 joint). An extra $1,000 exemption for 65+ or blind. Itemized deductions are cut by 7.5% of federal AGI over $200,000.",
    seniorBreaks:
      "Senior tax credit: $1,000 single if federal AGI is $100,000 or less; $1,750 joint if $150,000 or less ($1,000 if only one spouse is 65+). Plus the extra $1,000 exemption, the 65+ pension exclusion and a two-income married couple subtraction of up to $1,200.",
    changes:
      "The 2025 budget law added the 6.25% and 6.5% brackets and the 2% capital gains tax, made the standard deduction flat and indexed, and raised the local tax cap to 3.30% (Allegany County rises to 3.20% and Kent to 3.30% for 2026). In 2026, HB 707 (adding IRAs to the pension exclusion) and HB 761 (raising the military subtraction) died in committee. The pension exclusion slips to $40,600 for 2026.",
    highlights: [
      "Social Security is fully exempt.",
      "At 65+, up to $40,600 of pension and 401(k) income excluded in 2026 — minus Social Security.",
      "IRA withdrawals do not qualify for the pension exclusion.",
      "County income tax of 2.25%–3.30% on top of state rates up to 6.5%.",
      "Senior tax credit of $1,000 ($1,750 joint) under the income limits.",
    ],
    metaDescription:
      "Maryland exempts Social Security and excludes up to $40,600 of pension income at 65+ in 2026, but taxes IRA withdrawals. State and county rates, credits.",
    sources: [
      { label: "Comptroller of Maryland — Maryland pension exclusion", url: "https://services.marylandcomptroller.gov/taxes/en/maryland-pension-exclusion?id=kb_article_view&sysparm_article=KB0010012" },
      { label: "Comptroller of Maryland — Seniors and retirees FAQ", url: "https://services.marylandcomptroller.gov/taxes/en/seniors-and-retirees-frequently-asked-questions?id=kb_article_view&sysparm_article=KB0010124" },
      { label: "Comptroller of Maryland — What’s new for the 2026 filing season", url: "https://services.marylandcomptroller.gov/taxes/en/what-s-new-for-the-2026-tax-filing-season-2025-tax-year?id=kb_article_view&sysparm_article=KB0010023" },
      { label: "Comptroller of Maryland — Tax alert: 2025 legislative changes to deductions and rates", url: "https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/alerts/tax-alert-changes-to-standard-and-itemized-deductions-and-to-state-and-local-income-tax-rates-from-the-2025-legislative-session.pdf" },
      { label: "Comptroller of Maryland — 2025 resident tax booklet", url: "https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/2025/resident-booklet.pdf" },
      { label: "Comptroller of Maryland — Technical Bulletin 51 (senior tax credit)", url: "https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/technical-bulletins/tb-51.pdf" },
      { label: "Comptroller of Maryland — 2026 withholding guide", url: "https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/withholding/2026/withholding-guide.pdf" },
      { label: "Maryland General Assembly — HB 707 (2026)", url: "https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/hb0707?ys=2026RS" },
      { label: "Maryland General Assembly — HB 761 (2026)", url: "https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/hb0761?ys=2026RS" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: [
      "Maryland’s 2026 standard deduction amounts are not yet published (the withholding guide’s $3,400 is a withholding figure); we show 2025 amounts.",
      "The 2026 pension exclusion ($40,600) is lower than 2025’s ($41,200); it is the Comptroller’s published figure.",
    ],
  },
  {
    code: "MA",
    name: "Massachusetts",
    slug: "massachusetts",
    taxYear: 2026,
    taxYearNote: "The 2026 rate and surtax threshold are official.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Massachusetts does not tax Social Security benefits.",
      detail: "Massachusetts gross income doesn’t include Social Security benefits; Railroad Retirement Tier I and II are exempt too.",
    },
    pensions: {
      taxed: "partially",
      summary: "Massachusetts and federal government pensions are exempt; most private pensions are taxed at 5%.",
      detail:
        "Contributory government pensions are excluded: Massachusetts state and local systems (including ORP, MBTA, police and fire) and federal civil service (including USPS). Another state’s contributory public pension is exempt only if that state returns the favor for Massachusetts pensions or has no income tax. Private pensions and annuities are taxable, and so are non-contributory pensions.",
      publicVsPrivate: "Contributory government pensions exempt; private pensions taxed at 5%.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are taxable at 5%.",
      detail:
        "The Massachusetts taxable amount can be lower than the federal amount because contributions you already paid Massachusetts tax on come back tax-free. Federal TSP and 457 distributions are fully taxable in the year paid.",
    },
    military: { taxed: "no", summary: "U.S. military pensions are excluded from Massachusetts income." },
    relief: { level: "moderate", headline: "Massachusetts and federal contributory government pensions are fully exempt; private pensions and IRAs are taxed." },
    rates: {
      type: "flat",
      topRate: 9,
      flatRate: 5,
      summary:
        "5% on most income — wages, pensions, IRA withdrawals, interest, dividends and long-term gains; 8.5% on short-term capital gains and 12% on collectibles. A 4% surtax applies to income over $1,107,750 in 2026 ($1,083,150 in 2025), for a top rate of 9%.",
    },
    deductions:
      "No standard deduction; personal exemptions instead — $4,400 single or married filing separately, $6,800 head of household, $8,800 joint. Add $700 for each filer 65 or older and $2,200 if blind.",
    seniorBreaks:
      "The $700 exemption at 65+. The refundable Senior Circuit Breaker credit (65+, based on property tax or rent) was up to $2,820 for 2025; the 2026 maximum has not been announced.",
    changes: "The surtax threshold is indexed each year ($1,107,750 for 2026; 2027 not yet announced). We found no 2025–2026 law changing how retirees’ income is taxed.",
    highlights: [
      "Social Security and military pensions are exempt.",
      "Massachusetts and federal government pensions are exempt.",
      "Private pensions and IRA/401(k) withdrawals are taxed at a flat 5%.",
      "A 4% surtax applies to income above $1,107,750 in 2026.",
      "Senior Circuit Breaker credit was up to $2,820 for 2025.",
    ],
    metaDescription:
      "Massachusetts exempts Social Security, military and government pensions, but taxes private pensions and IRA withdrawals at 5%. 2026 surtax, credits and sources.",
    sources: [
      { label: "Mass.gov — Massachusetts tax rates", url: "https://www.mass.gov/info-details/massachusetts-tax-rates" },
      { label: "Mass.gov — Tax information for seniors and retirees", url: "https://www.mass.gov/info-details/tax-information-for-seniors-and-retirees" },
      { label: "Mass.gov — Tax treatment of government pensions", url: "https://www.mass.gov/info-details/tax-treatment-of-government-pensions" },
      { label: "Mass.gov — 4% surtax on taxable income", url: "https://www.mass.gov/info-details/massachusetts-4-surtax-on-taxable-income" },
      { label: "Mass.gov — Senior Circuit Breaker tax credit", url: "https://www.mass.gov/info-details/senior-circuit-breaker-tax-credit" },
      { label: "Mass.gov — Personal income tax exemptions", url: "https://www.mass.gov/info-details/personal-income-tax-exemptions" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["The 2026 Senior Circuit Breaker maximum has not been announced; we show the 2025 amount."],
  },
  {
    code: "MI",
    name: "Michigan",
    slug: "michigan",
    taxYear: 2026,
    taxYearNote: "The 2026 rate, exemption and retirement cap are official.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Michigan does not tax Social Security benefits.",
      detail:
        "Taxable Social Security is fully subtracted. For 2026–2028, filers born after 1952 who are 67+ and use the Michigan standard deduction no longer have to reduce it by the Social Security subtraction (Public Act 24 of 2025).",
    },
    pensions: {
      taxed: "partially",
      summary: "For 2026, up to $67,610 of pension and IRA income is subtracted ($135,220 joint), whatever your birth year.",
      detail:
        "The Public Act 4 of 2023 phase-in is complete for 2026: the retirement and pension subtraction applies regardless of birth year, up to $67,610 for single or married filing separately and $135,220 for joint filers, covering public and private benefits combined. (In 2025, people born 1946–1966 could take 75%: $49,422 / $98,845.) You may instead choose the birth-year tier method, the police/fire/corrections method or the Michigan standard deduction ($20,000 single / $40,000 joint for those born after 1946 who have reached 67).",
      publicVsPrivate: "Public and private pensions share one combined cap.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA withdrawals and most defined-contribution payouts count toward the same 2026 cap; amounts above it are taxed at 4.25%.",
      detail: "Deferred compensation generally does not qualify.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt and does not count against the pension cap." },
    relief: { level: "large", headline: "Up to $67,610 ($135,220 joint) of pension and IRA income is subtracted in 2026, regardless of birth year." },
    rates: { type: "flat", topRate: 4.25, flatRate: 4.25, summary: "A flat 4.25% for 2026 (no formula cut was triggered). Some cities, such as Detroit, add a local income tax." },
    deductions:
      "No general standard deduction. Personal exemption: $5,900 for 2026 ($5,800 for 2025). People born after 1946 who have reached 67 can take the Michigan standard deduction ($20,000 / $40,000) instead of the retirement subtraction.",
    seniorBreaks:
      "The full retirement subtraction, the Michigan standard deduction at 67+, the Social Security subtraction and, for 2026–2028, the ability to combine Social Security with the standard deduction. The homestead property tax credit maximum was $1,900 for 2025.",
    changes:
      "2026 is the first year the retirement subtraction applies to everyone regardless of birth year. The cap is indexed; the 2027 amount is not yet announced. The Social Security/standard-deduction stacking applies for 2026–2028 only.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "2026: up to $67,610 ($135,220 joint) of pension and IRA income subtracted — no birth-year test.",
      "Flat 4.25% state rate; some cities add a local income tax.",
      "At 67+, Social Security can stack with the Michigan standard deduction for 2026–2028.",
      "Homestead property tax credit up to $1,900 (2025).",
    ],
    metaDescription:
      "Michigan exempts Social Security and military pay, and for 2026 subtracts up to $67,610 ($135,220 joint) of pension and IRA income at any age. Flat 4.25% rate.",
    faqExtra: [
      {
        q: "Does my birth year still matter for Michigan’s pension subtraction?",
        a: "Not for 2026. The phase-in under Public Act 4 of 2023 is complete, so everyone can subtract up to $67,610 ($135,220 joint) of pension and IRA income. You can still choose the older birth-year method or the Michigan standard deduction at 67+ if it works out better.",
      },
    ],
    sources: [
      { label: "Michigan Treasury — Retirement and pension benefits", url: "https://www.michigan.gov/taxes/iit/tax-guidance/tax-situations/retirement-and-pension-benefits" },
      { label: "Michigan Office of Retirement Services — Public Act 4 of 2023 FAQ", url: "https://www.michigan.gov/ors/public-act-4-of-2023-faq" },
      { label: "Michigan Treasury — Social Security changes in Public Act 24 of 2025", url: "https://www.michigan.gov/treasury/reference/taxpayer-notices/2025/11/17/social-security-taxation-changes-in-public-act-24-of-2025" },
      { label: "Michigan Treasury — 4.25% rate for the 2026 tax year", url: "https://www.michigan.gov/treasury/reference/taxpayer-notices/2026/04/15/425-income-tax-rate-for-individuals-and-fiduciaries-in-2026-tax-year" },
      { label: "Michigan Treasury — 2025 MI-1040 booklet", url: "https://www.michigan.gov/taxes/-/media/Project/Websites/taxes/Forms/IIT/TY2025/MI-1040-Book.pdf" },
      { label: "Michigan Treasury — 2026 withholding guide (Form 446)", url: "https://www.michigan.gov/taxes/-/media/Project/Websites/taxes/Forms/SUW/TY2026/446_Withholding-Guide_2026.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "MN",
    name: "Minnesota",
    slug: "minnesota",
    taxYear: 2026,
    taxYearNote: "Official inflation-adjusted 2026 amounts were published in December 2025.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      whoPays: "Filers with AGI above $86,410 ($110,780 joint) in 2026 — the exemption shrinks 10% per $4,000 over and is gone $40,000 above the threshold.",
      summary: "Social Security is fully exempt below $86,410 of AGI ($110,780 joint) in 2026; above that the exemption phases out.",
      detail:
        "Minnesota subtracts 100% of taxable Social Security when AGI is at or below $86,410 (single or head of household), $110,780 (joint or surviving spouse) or $55,390 (married filing separately) for 2026 (2025: $84,490 / $108,320 / $54,160). The subtraction shrinks by 10% for each $4,000 of AGI over the threshold ($2,000 if married filing separately), so it is gone once AGI is $40,000 over ($20,000 if separate). An older alternative method (up to $5,840 joint / $4,560 single, not indexed) rarely helps now.",
    },
    pensions: {
      taxed: "yes",
      summary: "Private pensions are fully taxed; public pensions too, except for service that didn’t earn Social Security credit.",
      detail:
        "The qualified public pension subtraction (Schedule M1QPEN) applies only to pensions for government service not covered by Social Security: up to $13,850 single, head of household or separate and $27,690 joint for 2026, phased out at the same incomes as the Social Security subtraction.",
      publicVsPrivate: "Private pensions: fully taxed. Public pensions: taxed unless the service was not covered by Social Security.",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable at regular rates (5.35% to 9.85%).", detail: "There is no age-based exclusion." },
    military: {
      taxed: "no",
      summary: "Military pensions and retirement pay, including reserve retirement and Survivor Benefit Plan payments, can be subtracted to the extent federally taxable (not combined with the Credit for Past Military Service).",
    },
    relief: { level: "narrow", headline: "Only public pensions for service not covered by Social Security get a subtraction (up to $13,850; $27,690 joint)." },
    rates: {
      type: "graduated",
      topRate: 9.85,
      brackets: [
        { over: 0, overJoint: 0, rate: 5.35 },
        { over: 33310, overJoint: 48700, rate: 6.8 },
        { over: 109430, overJoint: 193480, rate: 7.85 },
        { over: 203150, overJoint: 337930, rate: 9.85 },
      ],
      summary: "Four brackets for 2026: 5.35%, 6.8%, 7.85% and 9.85%; the top rate starts above $203,150 single and $337,930 joint. A separate 1% tax applies to net investment income over $1 million.",
    },
    deductions:
      "2026 standard deduction: $15,300 single or married filing separately, $23,000 head of household, $30,600 joint, plus $2,000 (single or head of household) or $1,600 (married) for 65+ or blind; both are limited at high incomes. Dependent exemption: $5,300. The federal $6,000 senior deduction does not reduce Minnesota tax, and Minnesota did not add its own version in 2026.",
    seniorBreaks:
      "The extra standard deduction at 65+, the Social Security subtraction, the M1R subtraction for people 65+ or disabled with low incomes, the full subtraction of Railroad Retirement benefits, and the property tax refund.",
    changes:
      "The income-limited Social Security subtraction dates from 2023 (thresholds indexed). The 2026 omnibus tax law (Laws 2026, Ch. 128) updated federal conformity but made no Social Security, pension or senior change. Bills for a full Social Security exemption were not enacted. 2027 thresholds come out in December.",
    highlights: [
      "Social Security is exempt below $86,410 of AGI ($110,780 joint), phasing out above.",
      "Pensions and IRA/401(k) withdrawals are fully taxed at 5.35%–9.85%.",
      "Military retirement pay can be fully subtracted.",
      "The federal $6,000 senior deduction doesn’t lower Minnesota tax.",
      "Railroad Retirement benefits are fully subtracted.",
    ],
    metaDescription:
      "Minnesota exempts Social Security below $86,410 AGI ($110,780 joint) in 2026 but fully taxes pensions and IRA withdrawals at up to 9.85%. Rules, sources.",
    sources: [
      { label: "Minnesota Department of Revenue — 2026 inflation-adjusted amounts", url: "https://www.revenue.state.mn.us/sites/default/files/2025-12/inflation-adjusted-amounts-2026.pdf" },
      { label: "Minnesota Department of Revenue — Social Security benefit subtraction", url: "https://www.revenue.state.mn.us/social-security-benefit-subtraction" },
      { label: "Minnesota Department of Revenue — Income tax rates and brackets", url: "https://www.revenue.state.mn.us/minnesota-income-tax-rates-and-brackets" },
      { label: "Minnesota Department of Revenue — 2025 Schedule M1M instructions", url: "https://www.revenue.state.mn.us/sites/default/files/2026-07/m1m-25.pdf" },
      { label: "Minnesota Department of Revenue — Military pension subtraction", url: "https://www.revenue.state.mn.us/military-pension-subtraction" },
      { label: "Minnesota Department of Revenue — 2026 enacted tax law summary (HF 2438)", url: "https://www.revenue.state.mn.us/sites/default/files/2026-05/hf2438sf2082-enacted-otb.pdf" },
      { label: "Minnesota Department of Revenue — Federal update: senior deduction", url: "https://www.revenue.state.mn.us/sites/default/files/2025-10/federal-update-senior-subtraction.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: [
      "Income limits for Minnesota’s M1R senior/disabled subtraction were not verified, so we don’t show them.",
    ],
  },
  {
    code: "MS",
    name: "Mississippi",
    slug: "mississippi",
    taxYear: 2026,
    taxYearNote: "The 2026 rate comes from the Department of Revenue’s withholding publication; cuts for 2027–2030 are already law.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Mississippi does not tax Social Security benefits.",
      detail: "Mississippi does not tax Social Security or Railroad Retirement benefits.",
    },
    pensions: {
      taxed: "no",
      summary: "Qualified retirement income from public and private plans is fully exempt once you meet the plan’s retirement requirements.",
      detail:
        "Social Security, Railroad Retirement and retirement income from federal, state and private retirement systems are exempt in total. Early or excess distributions taxable under federal rules, deferred compensation paid before retirement and separation pay are taxable.",
      publicVsPrivate: "Treated the same: both exempt.",
    },
    iraAnd401k: {
      taxed: "no",
      summary: "Qualified IRA and 401(k) distributions are exempt; early distributions are taxable.",
      detail: "Early distributions subject to the federal early-withdrawal rules are not considered retirement income and may be taxed.",
    },
    military: { taxed: "no", summary: "Military retirement pay is exempt as federal retirement income." },
    relief: { level: "all", headline: "All qualified retirement income — pensions, IRAs and 401(k)s — is exempt." },
    rates: {
      type: "flat",
      topRate: 4,
      flatRate: 4,
      summary:
        "0% on the first $10,000 of taxable income and 4.0% above for 2026 (4.4% in 2025). Already in law (HB 1, 2025): 3.75% in 2027, 3.5% in 2028, 3.25% in 2029 and 3% from 2030, with further cuts possible from 2031 if triggers are met.",
    },
    deductions:
      "Standard deduction: $2,300 single, $3,400 head of family, $4,600 joint. Exemption: $6,000 single, $9,500 head of family, $12,000 joint, $1,500 per dependent. These are set in law, not indexed.",
    seniorBreaks: "An extra $1,500 exemption for each filer 65+ (and $1,500 if blind), plus the full exemption of Social Security and qualified retirement income.",
    changes: "HB 1 (2025) sets the rate path: 3.75% (2027), 3.5% (2028), 3.25% (2029), 3% (2030+), with possible further cuts from 2031. The Department’s FAQ still shows the 2025 rate of 4.4%.",
    highlights: [
      "Social Security, pensions, IRAs, 401(k)s and military pay are all exempt.",
      "Only early or non-qualified distributions are taxed.",
      "0% on the first $10,000, then 4% for 2026.",
      "The rate falls every year to 3% by 2030 under current law.",
      "Extra $1,500 exemption at 65+.",
    ],
    metaDescription:
      "Mississippi exempts Social Security, pensions, IRA and 401(k) income and military pay. Other income pays 4% above $10,000 in 2026, falling to 3% by 2030.",
    sources: [
      { label: "Mississippi Department of Revenue — Individual income tax FAQs", url: "https://www.dor.ms.gov/individual/individual-income-tax-faqs" },
      { label: "Mississippi Department of Revenue — 2025 Form 80-100 instructions", url: "https://www.dor.ms.gov/sites/default/files/tax-forms/individual/80100251%202.pdf" },
      { label: "Mississippi Department of Revenue — Pub 89-700, 2026 withholding", url: "https://www.dor.ms.gov/sites/default/files/tax-forms/business/89700251revised1.13.2026.pdf" },
      { label: "Mississippi Department of Revenue — 2025 legislation", url: "https://www.dor.ms.gov/forms-resources/laws-regulations/2025-legislation" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "MO",
    name: "Missouri",
    slug: "missouri",
    taxYear: 2026,
    taxYearNote: "2026 rates come from the Department of Revenue’s 2026 withholding formula; pension caps from the 2025 instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      exemptAt65: true,
      whoPays: "Only recipients under 62 who are not on Social Security disability (for example, some survivors).",
      summary: "Missouri fully exempts Social Security for anyone 62 or older or on Social Security disability; younger recipients can be taxed.",
      detail:
        "Since 2024, 100% of taxable Social Security is deductible with no income limit — but only if you are 62 or older or receiving Social Security disability benefits. Filers 62–64 must check the “Age 62 through 64” box or the deduction is disallowed. A non-disabled recipient under 62 (for example, a survivor) doesn’t qualify.",
    },
    pensions: {
      taxed: "partially",
      summary: "Public pensions are exempt up to $47,633 per person (2025 cap); private pensions get at most $6,000, and only at lower incomes.",
      detail:
        "Public pensions (federal, state or local): exempt up to the maximum Social Security benefit — $47,633 per person for 2025 — minus any Social Security or disability deduction you claim. Private pensions: up to $6,000 per person, but only if income (not counting taxable Social Security) is under $25,000 single or head of household, $32,000 joint or $16,000 separate; the exemption drops $1 for each $1 over. The 2026 public pension cap is not yet published.",
      publicVsPrivate: "Public pensions: up to $47,633 per person (2025). Private pensions: up to $6,000, income-limited.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals count as private pension income: up to $6,000 per person is exempt under the income limits; the rest is taxed.",
      detail: "The limits are $25,000 single, $32,000 joint and $16,000 separate (not counting taxable Social Security), with the exemption reduced $1 for each $1 over.",
    },
    military: { taxed: "no", summary: "Military retirement pay is 100% subtracted." },
    relief: { level: "moderate", headline: "Public pensions are exempt up to $47,633 per person (2025); private pensions and IRAs get only $6,000, and only at low incomes." },
    rates: {
      type: "graduated",
      topRate: 4.7,
      brackets: [
        { over: 0, overJoint: 0, rate: 0 },
        { over: 1348, overJoint: 1348, rate: 2 },
        { over: 2696, overJoint: 2696, rate: 2.5 },
        { over: 4044, overJoint: 4044, rate: 3 },
        { over: 5392, overJoint: 5392, rate: 3.5 },
        { over: 6740, overJoint: 6740, rate: 4 },
        { over: 8088, overJoint: 8088, rate: 4.5 },
        { over: 9436, overJoint: 9436, rate: 4.7 },
      ],
      bracketsNote: "2026 thresholds come from the Department of Revenue’s 2026 withholding formula; the 2026 return tables are not yet published.",
      summary:
        "Eight brackets, the same for all filing statuses: 0% up to $1,348 of taxable income, rising in half-point steps to 4.7% above $9,436 (2026 withholding formula). Since 2025, 100% of capital gains can be subtracted.",
    },
    deductions:
      "Missouri uses the federal standard deduction — $16,100 single, $32,200 joint and $24,150 head of household for 2026 — including the federal extra amount for 65+. The federal $6,000 senior deduction and the tips and overtime deductions can’t be claimed on the Missouri return. No personal exemption.",
    seniorBreaks:
      "The Social Security deduction at 62+, the public and private pension exemptions and the federal 65+ standard deduction add-on. The Senior Property Tax Credit expands from 2026 with higher income limits and credit amounts, now indexed.",
    changes:
      "SB 190 (2023) made the Social Security deduction 100% from 2024. HB 594 (2025): a 100% capital gains subtraction from 2025 and a bigger Senior Property Tax Credit from 2026. HB 754 (2025): a subtraction for gains on specie and legal tender from 2026. Amendment 5, which would have phased out the income tax, was rejected by voters on August 4, 2026.",
    highlights: [
      "Social Security is fully exempt at 62+ (or on disability).",
      "Military retirement pay is fully exempt.",
      "Public pensions are exempt up to $47,633 per person (2025 cap).",
      "Private pensions and IRAs: only $6,000, and only at low incomes.",
      "Top rate 4.7%; all capital gains can be subtracted since 2025.",
    ],
    metaDescription:
      "Missouri exempts Social Security at 62+, military pay and public pensions up to $47,633 (2025), but taxes most IRA income. Top rate 4.7% in 2026. Sources.",
    faqExtra: [
      {
        q: "Why is Missouri listed among states that tax Social Security?",
        a: "Only because of an age rule. Missouri deducts 100% of taxable benefits for anyone 62 or older or on Social Security disability, with no income limit. A non-disabled recipient under 62 — a survivor, for example — doesn’t qualify. Filers 62–64 must check the age box on the return.",
      },
    ],
    sources: [
      { label: "Missouri Department of Revenue — 2025 tax reference guide (Form 4711)", url: "https://dor.mo.gov/forms/4711_2025.pdf" },
      { label: "Missouri Department of Revenue — 2025 MO-1040 instructions", url: "https://dor.mo.gov/forms/MO-1040%20Instructions_2025.pdf" },
      { label: "Missouri Department of Revenue — 2026 withholding formula", url: "https://dor.mo.gov/forms/Withholding%20Formula_2026.pdf" },
      { label: "Missouri Department of Revenue — Year changes", url: "https://dor.mo.gov/taxation/individual/tax-types/income/year-changes/" },
      { label: "Missouri Department of Revenue — 2026 tax legislative changes", url: "https://dor.mo.gov/taxation/individual/tax-types/income/year-changes/documents/2026-Tax-Legislative-Changes.pdf" },
      { label: "Office of the Governor — Statement on Amendment 5 results", url: "https://governor.mo.gov/official-statements/amendment-5-august-primary-election-results" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Missouri’s 2026 public pension cap is not yet published; we show the 2025 cap. 2026 brackets come from the withholding formula, not a 2026 return."],
  },
];
