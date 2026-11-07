/**
 * Montana – Pennsylvania. Facts: docs/research/states_c.json, checked against docs/research/verify_states_c.json.
 * Verifier corrections applied: OH personal-exemption cutoff is $500,000 from 2026 (not $750,000). Verifier-supplied
 * missing items used: NE exemption credit, NM low/middle-income exemption and medical credit, NC trigger floor,
 * OK 2026 legislation, MT EITC. Unverifiable items (MT 2026 senior subtraction, NM senior-deduction inference,
 * NH historical rates, PA 2026 budget) are softened and listed in `notes`.
 */
import type { StateTaxInput } from "./types";

const V = "2026-10-23" as const;

export const STATES_C: StateTaxInput[] = [
  {
    code: "MT",
    name: "Montana",
    slug: "montana",
    taxYear: 2026,
    taxYearNote: "2026 and 2027 rates are official (HB 337); the 65+ subtraction shown is the 2025 amount — the 2026 indexed figure is not yet published.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "yes",
      whoPays: "Anyone whose benefits are taxable on their federal return — Montana taxes the same portion.",
      summary: "Montana taxes Social Security the same way the federal government does.",
      detail:
        "Since 2024 Montana starts from federal taxable income and has no Social Security subtraction, so whatever part of your benefits is taxable federally is taxable in Montana. The old Montana-specific calculation was repealed. The general 65+ subtraction and the federal $6,000 senior deduction, which flows through, soften the bill.",
    },
    pensions: {
      taxed: "partially",
      summary: "Pensions are taxable; the only relief is a $5,660 subtraction per person 65+ (2025) from any income.",
      detail:
        "Public and private pensions are taxed as included in federal taxable income. The partial pension, annuity and IRA exemption was repealed January 1, 2024. Taxpayers 65 and older subtract $5,660 each (2025; $11,320 if both spouses are 65+) from any kind of income, with no income limit. Railroad Retirement benefits are not taxed.",
      publicVsPrivate: "Treated the same: taxable.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals are fully taxable; only the general 65+ subtraction reduces them.",
      detail: "The former partial pension and IRA exemption was repealed from January 1, 2024.",
    },
    military: {
      taxed: "partially",
      summary:
        "Only working military retirees get a break: the lesser of 50% of military retirement pay or their Montana wages and business income, for up to five years. With no Montana earned income, the exclusion is $0.",
    },
    relief: { level: "small", headline: "No pension exclusion — just a $5,660 subtraction per person 65+ (2025) against any income." },
    rates: {
      type: "graduated",
      topRate: 5.65,
      brackets: [
        { over: 0, overJoint: 0, rate: 4.7 },
        { over: 47500, overJoint: 95000, rate: 5.65 },
      ],
      summary:
        "Two rates on ordinary income for 2026: 4.7% up to $47,500 single ($95,000 joint, $71,250 head of household) and 5.65% above — down from 5.9% in 2025. For 2027: 4.7% up to $65,000 single ($130,000 joint) and 5.4% above. Long-term capital gains are taxed at 3.0% and 4.1%.",
    },
    deductions:
      "No separate Montana standard deduction or personal exemption: Montana uses your federal standard deduction (including the 65+/blind add-on) or your federal itemized deductions minus state income tax.",
    seniorBreaks:
      "The 65+ subtraction ($5,660 per person for 2025, indexed each year). The federal $6,000 enhanced senior deduction flows into Montana taxable income for 2025–2028. The Elderly Homeowner/Renter Credit pays up to $1,150 if you are 62+ with household income under $45,000.",
    changes:
      "HB 337 (2025): 2026 brackets widened and the top rate cut from 5.9% to 5.65%; the 2027 top rate is 5.4% with wider brackets; the Montana earned income credit rises to 20% of the federal credit from 2026. The 2024 overhaul moved the starting point to federal taxable income and repealed the partial pension and IRA exemption.",
    highlights: [
      "Social Security is taxed the same way as on your federal return.",
      "Pensions and IRA/401(k) withdrawals are taxed — no pension exclusion since 2024.",
      "Each person 65+ subtracts $5,660 (2025) from any income.",
      "Top rate falls to 5.65% in 2026 and 5.4% in 2027.",
      "The federal $6,000 senior deduction flows through to Montana.",
    ],
    metaDescription:
      "Montana taxes Social Security like the IRS does and taxes pensions and IRA withdrawals, with a $5,660 subtraction at 65+. Top rate 5.65% in 2026. Sources.",
    faqExtra: [
      {
        q: "Why does Montana tax Social Security now?",
        a: "Since 2024 Montana starts from federal taxable income and repealed its separate Social Security calculation, so the portion of your benefits that is taxable on your federal return is taxable in Montana too. The 65+ subtraction and the federal $6,000 senior deduction (2025–2028) reduce the bill.",
      },
    ],
    sources: [
      { label: "Montana Department of Revenue — 2025 Form 2 instructions", url: "https://revenue.mt.gov/files/forms/Montana-Individual-Income-Tax-Return-Form-2-Instructions/2025_Montana_Individual_Income_Tax_Return_Form_2_Instructions.pdf" },
      { label: "Montana Department of Revenue — HB 337 changes", url: "https://revenue.mt.gov/news/recent-news/HB-337" },
      { label: "Montana Department of Revenue — Form 2 changes", url: "https://revenue.mt.gov/files/Forms/Montana-Individual-Income-Tax-Return-Form-2/Form-2-Changes.pdf" },
      { label: "Montana Department of Revenue — 2026 Publication 1", url: "https://revenuefiles.mt.gov/files/Forms/Publication-1/Publication-1-2026.pdf" },
      { label: "Montana Code Annotated §15-30-2120", url: "https://mca.legmt.gov/bills/mca/title_0150/chapter_0300/part_0210/section_0200/0150-0300-0210-0200.html" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Montana must publish its indexed 2026 age-65 subtraction by November 1, 2026; until then we show the 2025 amount ($5,660)."],
  },
  {
    code: "NE",
    name: "Nebraska",
    slug: "nebraska",
    taxYear: 2026,
    taxYearNote: "Rates are set in law; 2026 brackets and standard deduction come from draft forms dated August 17, 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Nebraska does not tax Social Security benefits.",
      detail: "Since 2024, 100% of federally taxable Social Security is excluded, with no income limit and no age test.",
    },
    pensions: {
      taxed: "yes",
      summary: "Private and state or local government pensions are taxable; federal CSRS annuities and military pay are exempt.",
      detail:
        "From 2024, federal Civil Service Retirement System (CSRS) annuities can be deducted — FERS annuities cannot. Retired law enforcement officers and firefighters (20+ years of service, 60+) can deduct health insurance premiums. Railroad Retirement benefits are deductible.",
      publicVsPrivate: "Private and state/local pensions are taxed; federal CSRS annuities are exempt.",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable.", detail: "Nebraska has no general or age-based retirement exclusion." },
    military: { taxed: "no", summary: "Military retirement pay is 100% excluded since 2022 (including Coast Guard, PHS and NOAA retirees)." },
    relief: { level: "narrow", headline: "Only federal CSRS annuities and military pay are excluded; other pensions and IRAs are taxed." },
    rates: {
      type: "graduated",
      topRate: 4.55,
      brackets: [
        { over: 0, overJoint: 0, rate: 2.46 },
        { over: 4130, overJoint: 8250, rate: 3.51 },
        { over: 24760, overJoint: 49530, rate: 4.55 },
      ],
      bracketsNote: "2026 thresholds come from the Department of Revenue’s draft schedule (August 17, 2026) and are indexed.",
      summary: "Top rate 4.55% for 2026, down from 5.2% in 2025, and 3.99% from 2027 under current law. Draft 2026 brackets: 2.46% up to $4,130 single ($8,250 joint), 3.51% up to $24,760 ($49,530 joint), 4.55% above.",
    },
    deductions:
      "2025 standard deduction: $8,600 single or married filing separately, $17,200 joint, $12,600 head of household; 65+ or blind adds $2,000 (single or head of household) or $1,650 per box (married). The 2026 draft form shows $8,850 / $17,700 / $12,950. Personal exemption credit: $171 for 2025 ($176 on the 2026 draft).",
    seniorBreaks: "The extra standard deduction at 65+ and the Nebraska credit for the elderly or disabled. Nebraska starts from federal AGI, so the federal $6,000 senior deduction does not carry over.",
    changes:
      "LB 754 (2023) set the rate path: 5.2% (2025), 4.55% (2026), 3.99% (2027 on). The Social Security exclusion reached 100% in 2024. The 2026 session did not change rates, Social Security or military retirement. Final 2026 forms come later in the year.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Federal CSRS annuities are deductible (FERS is not).",
      "Private pensions, state pensions and IRA withdrawals are fully taxed.",
      "Top rate 4.55% in 2026, falling to 3.99% in 2027.",
      "Extra standard deduction at 65+.",
    ],
    metaDescription:
      "Nebraska exempts Social Security, military pay and federal CSRS annuities, but taxes private pensions and IRA withdrawals. Top rate 4.55% in 2026.",
    sources: [
      { label: "Nebraska Department of Revenue — 2026 tax calculation schedule (draft)", url: "https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/drafts/2026_tax_calculation_schedule.pdf" },
      { label: "Nebraska Department of Revenue — 2026 Form 1040N (draft)", url: "https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/drafts/f_1040n.pdf" },
      { label: "Nebraska Department of Revenue — 2025 individual income tax booklet", url: "https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/2025/f_Individual_Income_Tax_Booklet.pdf" },
      { label: "Nebraska Legislature — Statute 77-2715.03 (rates)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=77-2715.03" },
      { label: "Nebraska Legislature — Statute 77-2716 (adjustments)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=77-2716" },
      { label: "Nebraska Department of Revenue — Military retirement benefits exclusion FAQ", url: "https://revenue.nebraska.gov/about/frequently-asked-questions/military-retirement-benefits-exclusion" },
      { label: "Nebraska Department of Revenue — 2026 legislative changes", url: "https://revenue.nebraska.gov/about/2026-nebraska-legislative-changes" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Nebraska’s 2026 brackets and standard deduction come from draft forms and may change when finalized."],
  },
  {
    code: "NV",
    name: "Nevada",
    slug: "nevada",
    taxYear: 2026,
    taxYearNote: "Nevada does not impose a state income tax on individuals.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Nevada has no individual income tax, so Social Security is not taxed.",
      detail: "The Nevada Department of Taxation confirms the state does not impose an income tax on individuals.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed — Nevada has no individual income tax.", detail: "Public and private pensions owe no state income tax." },
    iraAnd401k: { taxed: "no", summary: "IRA and 401(k) withdrawals are not taxed.", detail: "With no individual income tax, withdrawals and required minimum distributions owe no state tax." },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No individual income tax, so every kind of retirement income is untaxed by the state." },
    rates: {
      type: "none",
      topRate: 0,
      summary: "No personal income tax. Nevada relies on sales and property taxes; its Commerce Tax applies to businesses with gross revenue over $4 million, not to individuals.",
    },
    deductions: "Not applicable — there is no individual income tax.",
    seniorBreaks: "Not applicable to income tax. Property-tax programs exist separately and are not covered here.",
    changes: "None found. Residents have no state income tax return to file.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "No state income tax return for residents.",
      "The Commerce Tax applies only to large businesses, not individuals.",
    ],
    noTaxNote: "There is no individual income tax; the Commerce Tax applies only to large businesses.",
    metaDescription:
      "Nevada has no individual income tax, so Social Security, pensions, IRA and 401(k) withdrawals and military pay are all untaxed. 2026 facts and sources.",
    sources: [{ label: "Nevada Department of Taxation — Income tax in Nevada", url: "https://tax.nv.gov/about-nevada-department-of-taxation/income-tax-in-nevada/" }],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "NH",
    name: "New Hampshire",
    slug: "new-hampshire",
    taxYear: 2026,
    taxYearNote: "The Interest and Dividends Tax was repealed for tax periods beginning after December 31, 2024.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "New Hampshire has no tax on Social Security or any other retirement income.",
      detail: "New Hampshire never taxed wages, pensions or Social Security. Its only individual income tax — the Interest and Dividends Tax — was repealed effective January 1, 2025.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed.", detail: "New Hampshire has no tax on wages, pensions or other retirement income." },
    iraAnd401k: {
      taxed: "no",
      summary: "IRA and 401(k) withdrawals are not taxed.",
      detail: "Not taxed. With the Interest and Dividends Tax repealed, there is no state tax on investment income either from 2025.",
    },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No broad income tax, and no tax on interest and dividends from 2025." },
    rates: { type: "none", topRate: 0, summary: "No broad income tax, and from 2025 no tax on interest and dividends either." },
    deductions: "Not applicable — there is no individual income tax from 2025.",
    seniorBreaks: "None needed for income tax. Local property-tax exemptions for older residents exist but are not covered here.",
    changes:
      "HB 2 (2023) moved the repeal of the Interest and Dividends Tax up to tax periods beginning after December 31, 2024. Returns for 2024 were still due; there is nothing to file for 2025 or 2026.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "The Interest and Dividends Tax is gone from 2025 — no state tax on investment income.",
      "Nothing to file for 2025 or 2026.",
    ],
    noTaxNote: "Wages and pensions were never taxed, and the tax on interest and dividends ended with 2024.",
    metaDescription:
      "New Hampshire taxes no retirement income: its Interest and Dividends Tax ended in 2025, so Social Security, pensions, IRAs and investment income are untaxed.",
    sources: [
      { label: "New Hampshire General Court — RSA Chapter 77 (repealed)", url: "https://gc.nh.gov/rsa/html/V/77/77-mrg.htm" },
      { label: "NH Department of Revenue Administration — Interest and Dividends Tax", url: "https://www.revenue.nh.gov/taxes-glance/interest-dividends-tax" },
      { label: "NH Department of Revenue Administration — Interest and Dividends Tax FAQs", url: "https://www.revenue.nh.gov/resource-center/frequently-asked-questions/interest-dividends-tax-frequently-asked-questions" },
      { label: "NH Department of Revenue Administration — Repeal of the I&D Tax now in effect", url: "https://www.revenue.nh.gov/news-and-media/repeal-nh-interest-and-dividends-tax-now-effect" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["The state revenue department’s website blocked our verifier, so we don’t show historical Interest and Dividends Tax rates; the repeal itself is confirmed in the statutes."],
  },
  {
    code: "NJ",
    name: "New Jersey",
    slug: "new-jersey",
    taxYear: 2026,
    taxYearNote: "Rates and exclusions are set in law and not indexed; facts from the 2025 NJ-1040 instructions. No 2026 change found.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "New Jersey does not tax Social Security benefits.",
      detail: "Federal Social Security and Railroad Retirement (Tier 1 and Tier 2) are exempt, with no income limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "At 62+, up to $100,000 of pension and IRA income is excluded ($75,000 single) — but only if total income is $150,000 or less.",
      detail:
        "To use the pension/retirement exclusion you must be 62+ (or blind or disabled) and have New Jersey gross income of $150,000 or less. With income up to $100,000 you can exclude up to $100,000 (joint), $75,000 (single, head of household or surviving spouse) or $50,000 (separate). From $100,001 to $125,000 the exclusion is 50% / 37.5% / 25% of pension income; from $125,001 to $150,000 it’s 25% / 18.75% / 12.5%. Above $150,000 there is no exclusion at all. On a joint return only the 62+ spouse’s pension counts. Unused exclusion can cover other income if your wages and business income total $3,000 or less. If you were never eligible for Social Security or Railroad Retirement, a special $6,000 ($3,000 single) exclusion applies.",
      publicVsPrivate: "Same exclusion for both.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals qualify for the same 62+ exclusion and the same $150,000 income cliff.",
      detail: "New Jersey also lets you recover contributions you already paid New Jersey tax on, under its own basis rules.",
    },
    military: { taxed: "no", summary: "U.S. military pensions and survivor benefit payments are fully exempt; honorably discharged veterans also get a $6,000 exemption." },
    relief: {
      level: "large",
      incomeLimited: true,
      headline: "At 62+, up to $100,000 ($75,000 single) of pension and IRA income is excluded — if income is $150,000 or less.",
    },
    rates: {
      type: "graduated",
      topRate: 10.75,
      brackets: [
        { over: 0, overJoint: 0, rate: 1.4 },
        { over: 20000, overJoint: 20000, rate: 1.75 },
        { over: null, overJoint: 50000, rate: 2.45 },
        { over: 35000, overJoint: 70000, rate: 3.5 },
        { over: 40000, overJoint: 80000, rate: 5.525 },
        { over: 75000, overJoint: 150000, rate: 6.37 },
        { over: 500000, overJoint: 500000, rate: 8.97 },
        { over: 1000000, overJoint: 1000000, rate: 10.75 },
      ],
      bracketsNote: "Single filers have no 2.45% bracket. Head of household and surviving spouse use the joint table.",
      summary: "Graduated rates from 1.4% to 10.75%. Single filers pay 6.37% from $75,000 to $500,000; joint filers reach 6.37% at $150,000. The 10.75% rate applies above $1 million.",
    },
    deductions:
      "No standard deduction. Personal exemptions: $1,000 each for you and your spouse, plus $1,000 if 65+, $1,000 if blind or disabled and $6,000 for veterans. Filing threshold: $20,000 joint or head of household, $10,000 single or separate.",
    seniorBreaks:
      "The extra $1,000 exemption at 65+, the pension and other-retirement-income exclusions at 62+, and the property tax credit or deduction for homeowners and tenants 65+ or disabled. ANCHOR, Senior Freeze and Stay NJ are separate property-tax programs.",
    changes:
      "We found no enacted change to rates or the retirement exclusion for 2026, including in the FY2027 budget signed June 30, 2026. Bills to remove or soften the $150,000 cliff were introduced but not enacted.",
    highlights: [
      "Social Security and military pensions are fully exempt.",
      "At 62+, up to $100,000 of retirement income excluded for couples ($75,000 single).",
      "The exclusion ends completely above $150,000 of income — a hard cliff.",
      "Rates from 1.4% to 10.75%.",
      "Extra $1,000 exemption at 65+; $6,000 veteran exemption.",
    ],
    metaDescription:
      "New Jersey exempts Social Security and military pensions, and at 62+ excludes up to $100,000 of pension and IRA income if income is $150,000 or less.",
    faqExtra: [
      {
        q: "What is New Jersey’s $150,000 retirement income cliff?",
        a: "The pension and IRA exclusion at 62+ is only available if your New Jersey gross income is $150,000 or less. It is full up to $100,000 of income, shrinks to a percentage of pension income between $100,001 and $150,000, and disappears entirely above $150,000 — even by one dollar.",
      },
    ],
    sources: [{ label: "New Jersey Division of Taxation — 2025 NJ-1040 instructions", url: "https://www.nj.gov/treasury/taxation/pdf/current/1040i.pdf" }],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "NM",
    name: "New Mexico",
    slug: "new-mexico",
    taxYear: 2026,
    taxYearNote: "Rates from HB 252 (2024) apply from 2025 and are not indexed; exemptions from the 2025 PIT-ADJ instructions. No 2026 change enacted.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      whoPays: "Filers with federal AGI over $100,000 single ($150,000 joint or head of household, $75,000 separate) — all taxable benefits, an all-or-nothing cliff.",
      summary: "Social Security is fully exempt if AGI is $100,000 or less ($150,000 joint); above that, all of the federally taxable amount is taxed.",
      detail:
        "The exemption applies if federal AGI does not exceed $100,000 single, $75,000 married filing separately, or $150,000 joint, head of household or surviving spouse. It is all-or-nothing: one dollar over and the full federally taxable amount is taxed. There is no age requirement, and the thresholds are not indexed.",
    },
    pensions: {
      taxed: "yes",
      summary: "Public and private pensions are fully taxable; New Mexico has no pension exclusion.",
      detail: "Relief comes only through the 65+ exemption (up to $8,000 per person, low incomes only) and the armed forces retirement exemption.",
      publicVsPrivate: "Treated the same: taxable.",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable.", detail: "Only the income-limited 65+ exemption applies." },
    military: { taxed: "partially", summary: "Up to $30,000 per retiree of armed forces retirement pay is exempt (each spouse can claim $30,000). A 2026 bill to remove the cap died." },
    relief: { level: "narrow", headline: "No pension or IRA exclusion; the 65+ exemption of up to $8,000 applies only at low incomes." },
    rates: {
      type: "graduated",
      topRate: 5.9,
      brackets: [
        { over: 0, overJoint: 0, rate: 1.5 },
        { over: 5500, overJoint: 8000, rate: 3.2 },
        { over: 16500, overJoint: 25000, rate: 4.3 },
        { over: 33500, overJoint: 50000, rate: 4.7 },
        { over: 66500, overJoint: 100000, rate: 4.9 },
        { over: 210000, overJoint: 315000, rate: 5.9 },
      ],
      summary: "Six brackets from 1.5% to 5.9%; the top rate applies above $210,000 single or $315,000 joint. Not indexed, so 2026 matches 2025.",
    },
    deductions:
      "New Mexico uses your federal standard or itemized deduction, plus a $4,000 deduction for each qualifying dependent after the first. A low- and middle-income exemption of up to $2,500 per exemption applies when AGI is $36,667 or less single ($55,000 joint, $27,500 separate).",
    seniorBreaks:
      "Exemption for 65+ or blind: up to $8,000 per person, in full at AGI up to $18,000 single or $30,000 joint, shrinking to zero above $28,500 single or $51,000 joint. People 65+ with unreimbursed medical expenses of $28,000 or more get a $3,000 medical care exemption and a refundable $2,800 medical care credit. A property tax rebate of up to $250 at 65+ with modified gross income of $16,000 or less. An exemption for people 100 and older.",
    changes:
      "HB 252 restructured the brackets from 2025. SB 151 (signed March 11, 2026) adds business and professional credits from 2027 but nothing on Social Security, pensions or the 65+ exemption. SB 116, which would have removed the military cap, died. The Social Security thresholds are not indexed.",
    highlights: [
      "Social Security is exempt up to $100,000 of AGI ($150,000 joint) — but it’s a cliff.",
      "Pensions and IRA/401(k) withdrawals are fully taxed.",
      "Up to $30,000 of military retirement pay exempt per retiree.",
      "Rates of 1.5% to 5.9%; the top rate starts above $210,000 single.",
      "The 65+ exemption of up to $8,000 applies only at low incomes.",
    ],
    metaDescription:
      "New Mexico exempts Social Security up to $100,000 AGI ($150,000 joint) — a cliff — but fully taxes pensions and IRA withdrawals. Rates 1.5% to 5.9%.",
    faqExtra: [
      {
        q: "What happens if my income is just over New Mexico’s Social Security limit?",
        a: "You lose the whole exemption. New Mexico’s Social Security exemption is all-or-nothing: at federal AGI above $100,000 single ($150,000 joint or head of household, $75,000 separate), the full federally taxable amount of your benefits is taxed. Keeping AGI under the line — for example by timing IRA withdrawals — can matter a lot.",
      },
    ],
    sources: [
      { label: "NM Taxation and Revenue — 2025 PIT-ADJ instructions", url: "https://realfile.tax.newmexico.gov/2025pit-adj-ins.pdf" },
      { label: "NM Taxation and Revenue — 2025 PIT-1 instructions", url: "https://realfile.tax.newmexico.gov/2025pit-1-ins.pdf" },
      { label: "NM Taxation and Revenue — 2025 PIT-RC instructions", url: "https://realfile.tax.newmexico.gov/2025pit-rc-ins.pdf" },
      { label: "New Mexico Legislature — HB 252 (2024)", url: "https://www.nmlegis.gov/Sessions/24%20Regular/final/HB0252.pdf" },
      { label: "New Mexico Legislature — SB 116 (2026)", url: "https://www.nmlegis.gov/Legislation/Legislation?chamber=S&legType=B&legNo=116&year=26" },
      { label: "NM Taxation and Revenue — Personal income tax overview", url: "https://www.tax.newmexico.gov/individuals/personal-income-tax-information-overview/" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: [
      "New Mexico hasn’t said explicitly whether the federal $6,000 senior deduction counts; its form points to a federal line that excludes it, so we don’t count it.",
      "We did not re-check HB 221 (2026), a second bill on the military cap.",
    ],
  },
  {
    code: "NY",
    name: "New York",
    slug: "new-york",
    taxYear: 2026,
    taxYearNote: "2026 rates are official (IT-2105-I and Tax Law 601); retirement rules come from the 2025 IT-201 instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "New York does not tax Social Security benefits.",
      detail: "Social Security (and Tier 1 Railroad Retirement) included in federal AGI is fully subtracted, with no income or age limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "New York State, local and federal (including military) pensions are fully exempt; up to $20,000 of other pensions is excluded at 59½+.",
      detail:
        "Pensions from New York State or local governments and from the federal government, including the military, are fully exempt at any age. Private pensions and pensions from other states’ governments qualify for the pension and annuity exclusion: up to $20,000 per person if you are 59½ or older (prorated in the year you turn 59½). Each spouse gets their own $20,000; unused amounts can’t be transferred.",
      publicVsPrivate: "NY and federal government pensions: fully exempt. Private and out-of-state government pensions: $20,000 exclusion at 59½+.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals share the same $20,000-per-person exclusion at 59½+; amounts above it are taxed.",
      detail: "Periodic and lump-sum IRA distributions and 401(k), 403(b) and 457 periodic payments qualify, except amounts from contributions made after retirement.",
    },
    military: { taxed: "no", summary: "Military retirement pay is fully exempt as a federal pension, at any age." },
    relief: { level: "large", headline: "Government pensions are fully exempt, and up to $20,000 per person of private pension or IRA income is excluded at 59½+." },
    rates: {
      type: "graduated",
      topRate: 10.9,
      brackets: [
        { over: 0, overJoint: 0, rate: 3.9 },
        { over: 8500, overJoint: 17150, rate: 4.4 },
        { over: 11700, overJoint: 23600, rate: 5.15 },
        { over: 13900, overJoint: 27900, rate: 5.4 },
        { over: 80650, overJoint: 161550, rate: 5.9 },
        { over: 215400, overJoint: 323200, rate: 6.85 },
        { over: 1077550, overJoint: 2155350, rate: 9.65 },
        { over: 5000000, overJoint: 5000000, rate: 10.3 },
        { over: 25000000, overJoint: 25000000, rate: 10.9 },
      ],
      summary:
        "Nine brackets for 2026 from 3.9% to 10.9%. The 5.4% rate runs to $80,650 of taxable income single ($161,550 joint) and 5.9% to $215,400 ($323,200 joint); the 9.65%–10.9% rates start above $1,077,550 single. New York City and Yonkers residents pay local income tax on top.",
    },
    deductions:
      "Standard deduction (not indexed): $8,000 single or married filing separately, $11,200 head of household, $16,050 joint or surviving spouse. Dependent exemption: $1,000 each; no personal exemption for you or your spouse, and no extra standard deduction at 65+.",
    seniorBreaks:
      "The $20,000 pension and annuity exclusion at 59½, the full exemption of NY and federal pensions, and the Social Security subtraction. New York starts from federal AGI, so the federal $6,000 senior deduction does not carry over. Real property tax credits and STAR are separate property-tax programs.",
    changes:
      "The 2025 budget cut the bottom five rates by 0.1 point for 2026 and by another 0.1 point for 2027–2032, and kept the 9.65% / 10.3% / 10.9% top rates through 2032. We found no change to the $20,000 pension exclusion in the FY2027 budget (enacted May 2026).",
    highlights: [
      "Social Security is fully exempt.",
      "New York and federal government pensions — including military — are fully exempt.",
      "Up to $20,000 per person of private pension and IRA income excluded at 59½+.",
      "Rates from 3.9% to 10.9%; NYC and Yonkers residents pay local tax too.",
      "Small rate cuts in the lower brackets for 2026 and 2027.",
    ],
    metaDescription:
      "New York exempts Social Security and NY, federal and military pensions, and excludes $20,000 per person of other pension and IRA income at 59½+. 2026 rules.",
    sources: [
      { label: "NY Department of Taxation and Finance — IT-2105-I (2026 rate schedules)", url: "https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf" },
      { label: "NY Department of Taxation and Finance — IT-201 instructions", url: "https://www.tax.ny.gov/pdf/current_forms/it/it201i.pdf" },
      { label: "NY Department of Taxation and Finance — Information for retired persons", url: "https://www.tax.ny.gov/pit/file/information_for_seniors.htm" },
      { label: "New York State Senate — Tax Law §601 (rates)", url: "https://www.nysenate.gov/legislation/laws/TAX/601" },
      { label: "New York State Senate — Tax Law §612 (New York AGI)", url: "https://www.nysenate.gov/legislation/laws/TAX/612" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "NC",
    name: "North Carolina",
    slug: "north-carolina",
    taxYear: 2026,
    taxYearNote: "The 2026 rate is set by S.L. 2026-41; deductions come from the 2025 D-401 instructions, unchanged.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "North Carolina does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement benefits are not subject to North Carolina income tax, with no income or age limit.",
    },
    pensions: {
      taxed: "yes",
      summary: "Private pensions are taxed; only government retirees vested by August 12, 1989 (the Bailey settlement) are fully exempt.",
      detail:
        "Under the Bailey settlement, North Carolina state and local and federal (including military) pensions are 100% excluded if the retiree had five or more years of creditable service as of August 12, 1989. Other NC and federal government pensions are taxable (military has its own rule, below). Pensions from other states’ governments are taxable.",
      publicVsPrivate: "Private pensions: taxed. Government pensions: exempt only if vested under Bailey (5+ years by August 12, 1989).",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA, 401(k) and 403(b) withdrawals are fully taxable.",
      detail: "There is no age-based exclusion. The Bailey exception covers NC state 401(k) and 457 plans only for amounts contributed or contracted before August 12, 1989.",
    },
    military: {
      taxed: "partially",
      summary: "Fully deductible if you served at least 20 years or were medically retired (plus Survivor Benefit Plan payments to beneficiaries); others may qualify under Bailey, or else it’s taxed.",
    },
    relief: { level: "narrow", headline: "Only Bailey-vested government pensions (and 20-year military) are exempt; private pensions and IRAs are taxed." },
    rates: {
      type: "flat",
      topRate: 3.99,
      flatRate: 3.99,
      summary:
        "A flat 3.99% for 2026 (4.25% in 2025). Now fixed in law: 3.49% for 2027–2029, 3.24% for 2030–2032 and 2.99% from 2033, with possible triggered cuts to 2.74% and then 2.49% in 2035–2040.",
    },
    deductions:
      "Standard deduction: $12,750 single or married filing separately, $19,125 head of household, $25,500 joint or surviving spouse (2025 amounts, unchanged for 2026). No personal exemption.",
    seniorBreaks: "None based on age: North Carolina has no extra standard deduction for 65+ and does not allow the federal $6,000 senior deduction.",
    changes:
      "S.L. 2026-41 (the 2026 Appropriations Act, effective July 7, 2026) replaced the old trigger schedule with set rates: 3.49% (2027–2029), 3.24% (2030–2032), 2.99% (2033 on). It also allows gambling losses as an itemized deduction from 2025. No change to retirement provisions.",
    highlights: [
      "Social Security is fully exempt.",
      "Private pensions and IRA/401(k) withdrawals are taxed at a flat 3.99%.",
      "Government pensions vested by August 12, 1989 (Bailey) are fully exempt.",
      "Military retirement is exempt after 20 years or a medical retirement.",
      "The rate drops to 3.49% in 2027 — now locked into law.",
    ],
    metaDescription:
      "North Carolina exempts Social Security but taxes IRA withdrawals and most pensions at a flat 3.99% in 2026, falling to 3.49% in 2027. Bailey and military rules.",
    sources: [
      { label: "NC Department of Revenue — 2025 D-401 instructions", url: "https://www.ncdor.gov/2025-d-401-individual-income-tax-instructions/open" },
      { label: "NC General Assembly — Session Law 2026-41", url: "https://www.ncleg.gov/EnactedLegislation/SessionLaws/PDF/2025-2026/SL2026-41.pdf" },
      { label: "NC General Assembly — S257 legislative summary", url: "https://dashboard.ncleg.gov/api/Services/BillSummary/2025/S257-SMSV-136(sl)-v-4" },
      { label: "NC Department of Revenue — Withholding tables and instructions", url: "https://www.ncdor.gov/income-tax-withholding-tables-and-instructions-employers/open" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "ND",
    name: "North Dakota",
    slug: "north-dakota",
    taxYear: 2026,
    taxYearNote: "The 2026 rate schedule is official (Form ND-1ES 2026); exclusions come from the 2025 booklet.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "North Dakota does not tax Social Security benefits.",
      detail: "The federally taxable part of Social Security is fully excluded, with no income or age limit.",
    },
    pensions: {
      taxed: "yes",
      summary: "Pensions are taxable, but a 0% bracket covers the first $49,575 of taxable income ($82,800 joint) in 2026.",
      detail:
        "North Dakota has no general retirement exclusion. Exceptions: military retirement (100%), the civil service retirement of dual-status military technicians, a limited licensed peace officer exclusion and Railroad Retirement benefits.",
      publicVsPrivate: "Treated the same: taxable.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are taxable, though the 0% bracket covers the first $49,575 ($82,800 joint) of taxable income.",
      detail: "There is no IRA or 401(k) exclusion.",
    },
    military: { taxed: "no", summary: "Military retirement pay is 100% deductible, including for surviving spouses." },
    relief: { level: "none", headline: "No retirement exclusion, but the first $49,575 ($82,800 joint) of taxable income is taxed at 0%." },
    rates: {
      type: "graduated",
      topRate: 2.5,
      brackets: [
        { over: 0, overJoint: 0, rate: 0 },
        { over: 49575, overJoint: 82800, rate: 1.95 },
        { over: 250400, overJoint: 304850, rate: 2.5 },
      ],
      summary: "Three brackets for 2026: 0% up to $49,575 single ($82,800 joint), 1.95% up to $250,400 ($304,850 joint) and 2.5% above. Brackets are indexed; 2027 figures aren’t out yet.",
    },
    deductions:
      "North Dakota starts from federal taxable income, so your federal standard or itemized deduction — including the 65+ add-on and the federal $6,000 senior deduction for 2025–2028 — is already applied.",
    seniorBreaks: "No North Dakota-specific senior deduction, but the federal 65+ add-on and the $6,000 senior deduction flow through.",
    changes: "North Dakota automatically follows federal taxable income, so the 2025 federal changes (a higher standard deduction and an extra $6,000 for some seniors) apply for 2025–2028.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "0% on the first $49,575 of taxable income ($82,800 joint) in 2026.",
      "Top rate just 2.5%.",
      "The federal $6,000 senior deduction flows through.",
      "Pension and IRA income above the 0% band is taxed at 1.95%.",
    ],
    metaDescription:
      "North Dakota exempts Social Security and military pay and taxes nothing on the first $49,575 of taxable income ($82,800 joint) in 2026. Top rate 2.5%. Sources.",
    sources: [
      { label: "ND Office of State Tax Commissioner — 2026 Form ND-1ES", url: "https://www.tax.nd.gov/sites/www/files/documents/forms/individual/2025-iit/28709-form-nd-1es-2026.pdf" },
      { label: "ND Office of State Tax Commissioner — 2025 individual income tax booklet", url: "https://www.tax.nd.gov/sites/www/files/documents/forms/individual/2025-iit/2025-individual-income-tax-booklet.pdf" },
      { label: "ND Office of State Tax Commissioner — Individual income tax", url: "https://www.tax.nd.gov/individual-income-tax" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "OH",
    name: "Ohio",
    slug: "ohio",
    taxYear: 2026,
    taxYearNote: "The 2026 rate is set by HB 96; credits and deductions come from the 2025 IT 1040 booklet.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Ohio does not tax Social Security benefits.",
      detail: "Federally taxable Social Security is fully deducted, with no income or age limit.",
    },
    pensions: {
      taxed: "yes",
      summary: "Pensions are taxable; a retirement income credit of up to $200 per return helps if income is under $100,000.",
      detail:
        "Ohio starts from federal AGI and taxes public and private pensions. The retirement income credit is $0 to $200 per return depending on retirement income ($200 at $8,001 or more), if modified AGI less exemptions is under $100,000. A one-time lump sum retirement credit is an alternative.",
      publicVsPrivate: "Treated the same: taxable.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are taxable; they count toward the same up-to-$200 retirement income credit.",
      detail: "Distributions must be on account of retirement to count toward the credit.",
    },
    military: { taxed: "no", summary: "Military retirement pay is 100% deductible; federal civil service pensions that include military service get a proportional deduction." },
    relief: { level: "narrow", headline: "No retirement exclusion — only a retirement income credit of up to $200 per return." },
    rates: {
      type: "flat",
      topRate: 2.75,
      flatRate: 2.75,
      summary:
        "For 2026, 0% on the first $26,050 of nonbusiness taxable income and 2.75% above — effectively a flat tax, the same for all filing statuses (the 2025 top rate was 3.125%). Business income is taxed at a flat 3% after the business income deduction. Inflation indexing is suspended for 2025–2026.",
    },
    deductions:
      "No standard deduction. Personal and dependent exemptions depend on income: $2,400 if modified AGI is $40,000 or less, $2,150 up to $80,000, $1,900 up to $500,000, and none at $500,000 or more for 2026 (the cutoff was $750,000 for 2025).",
    seniorBreaks:
      "A $50 senior citizen credit per return at 65+, the lump sum distribution credit and the retirement income credit of up to $200 — all require modified AGI less exemptions under $100,000. The federal $6,000 senior deduction does not flow through.",
    changes:
      "HB 96 (the FY2026–27 budget) cut the top rate to 3.125% for 2025 and to a flat 2.75% from 2026, suspended indexing for 2025–2026, created a way for private retirement plans to withhold Ohio tax, and ends exemptions at $500,000 of income from 2026.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Effectively a flat 2.75% above $26,050 of taxable income in 2026.",
      "Pensions and IRA/401(k) withdrawals are taxed.",
      "Retirement income credit up to $200 and a $50 senior credit (income under $100,000).",
      "Personal exemptions end at $500,000 of income from 2026.",
    ],
    metaDescription:
      "Ohio exempts Social Security and military pay, and taxes pensions and IRA withdrawals at a flat 2.75% above $26,050 in 2026. Senior credits and sources.",
    sources: [
      { label: "Ohio Department of Taxation — 2025 IT 1040 booklet", url: "https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/forms/ohio_individual/individual/2025/it1040-booklet.pdf" },
      { label: "Ohio Revised Code §5747.02 — Tax rates", url: "https://codes.ohio.gov/ohio-revised-code/section-5747.02" },
      { label: "Ohio Revised Code §5747.025 — Personal exemptions", url: "https://codes.ohio.gov/ohio-revised-code/section-5747.025" },
      { label: "Ohio Department of Taxation — Senior citizens and Ohio income taxes", url: "https://tax.ohio.gov/individual/resources/senior-citizens-and-ohio-income-taxes" },
      { label: "Ohio Legislative Service Commission — HB 96 budget in brief", url: "https://lsc.ohio.gov/assets/legislation/136/hb96/en0/files/hb96-budget-in-brief-as-enacted-136th-general-assembly.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "OK",
    name: "Oklahoma",
    slug: "oklahoma",
    taxYear: 2026,
    taxYearNote: "2026 rates are official (HB 2764); exclusions come from the 2025 Form 511 packet.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Oklahoma does not tax Social Security benefits.",
      detail: "Social Security benefits included in federal AGI are subtracted, with no limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "Up to $10,000 per person of pension and IRA income is excluded; federal CSRS annuities paid instead of Social Security are fully exempt.",
      detail:
        "Federal CSRS annuities paid in lieu of Social Security are 100% excluded (also the FERS annuity supplement and the CSRS part of mixed annuities; regular FERS is not). Oklahoma public retirement and federal civil service pensions, and private “other retirement income”, share a combined exclusion of up to $10,000 per person. The income must be in your own name.",
      publicVsPrivate: "Public and private pensions share the same $10,000-per-person cap.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRAs, 401(k), 403(b), 457 plans and lump sums count toward the same $10,000-per-person exclusion; the excess is taxed.",
      detail: "Each person may exclude up to $10,000, but not more than the amount included in federal AGI.",
    },
    military: { taxed: "no", summary: "Military retirement pay is 100% excluded." },
    relief: { level: "moderate", headline: "Up to $10,000 per person of pension and IRA income is excluded." },
    rates: {
      type: "graduated",
      topRate: 4.5,
      brackets: [
        { over: 0, overJoint: 0, rate: 0 },
        { over: 3750, overJoint: 7500, rate: 2.5 },
        { over: 4900, overJoint: 9800, rate: 3.5 },
        { over: 7200, overJoint: 14400, rate: 4.5 },
      ],
      summary:
        "From 2026, four brackets: 0% on the first $3,750 single ($7,500 joint), then 2.5%, 3.5% and 4.5% above $7,200 ($14,400 joint) — down from a 4.75% top rate. Not indexed. Automatic 0.25-point cuts can follow revenue certifications, but the earliest possible cut is 2028.",
    },
    deductions:
      "Standard deduction: $6,350 single or married filing separately, $9,350 head of household, $12,700 joint. Personal exemption: $1,000 each. Oklahoma starts from federal AGI, so the federal $6,000 senior deduction does not carry over.",
    seniorBreaks:
      "An extra $1,000 exemption for each filer 65+ if federal AGI is $15,000 or less single, $25,000 joint, $12,500 separate or $19,000 head of household. The Sales Tax Relief Credit helps low-income households. The property “senior freeze” is a separate program.",
    changes:
      "HB 2764 (2025) cut the top rate to 4.5% and reduced six brackets to four from 2026. HB 2968 (2026), which would have raised the $10,000 exclusion to $20,000, did not pass. 2026 laws raised the caregiver credit and exempt gambling losses from the itemized-deduction cap from 2027.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Up to $10,000 per person of pension and IRA income excluded.",
      "Federal CSRS annuities paid in lieu of Social Security are fully exempt.",
      "New 4.5% top rate from 2026, with 0% on the first $3,750 ($7,500 joint).",
      "Earliest possible further rate cut: 2028.",
    ],
    metaDescription:
      "Oklahoma exempts Social Security and military pay and excludes up to $10,000 per person of pension and IRA income. New 4.5% top rate for 2026. Sources.",
    sources: [
      { label: "Oklahoma Tax Commission — 2025 Form 511 packet", url: "https://oklahoma.gov/content/dam/ok/en/tax/documents/forms/individuals/current/511-Pkt.pdf" },
      { label: "Oklahoma Legislature — HB 2764 (enrolled)", url: "https://www.oklegislature.gov/cf_pdf/2025-26%20ENR/hB/HB2764%20ENR.PDF" },
      { label: "Oklahoma Tax Commission — 2025 legislative update", url: "https://oklahoma.gov/content/dam/ok/en/tax/documents/resources/publications/legislation/2025LegislativeUpdate.pdf" },
      { label: "Oklahoma Legislature — HB 2968 (2026)", url: "http://www.oklegislature.gov/BillInfo.aspx?Bill=HB2968&Session=2600" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "OR",
    name: "Oregon",
    slug: "oregon",
    taxYear: 2026,
    taxYearNote: "2026 brackets and standard deduction are Department of Revenue estimates; retirement rules come from the 2025 OR-17 and OR-40 instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Oregon does not tax Social Security benefits.",
      detail: "Oregon doesn’t tax any Social Security, Railroad Retirement Board or railroad unemployment benefits.",
    },
    pensions: {
      taxed: "yes",
      summary: "Private and state or local pensions are fully taxable; federal pensions are partly exempt for service before October 1, 1991.",
      detail:
        "Federal pensions (including military) get a subtraction in proportion to service or points earned before October 1, 1991 — 100% if all service was before that date, 0% if all after. Low-income retirees 62+ may get the Retirement Income Credit.",
      publicVsPrivate: "Private and state/local pensions: taxed. Federal pensions: exempt for the pre-October 1991 share.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are fully taxable.",
      detail: "They can count toward the low-income Retirement Income Credit at 62+.",
    },
    military: { taxed: "partially", summary: "Military retirement pay is taxable except the share earned before October 1, 1991, which is subtracted like other federal pensions." },
    relief: { level: "narrow", headline: "Only the pre-October 1991 share of federal pensions is exempt; a 9% credit helps low-income retirees 62+." },
    rates: {
      type: "graduated",
      topRate: 9.9,
      brackets: [
        { over: 0, overJoint: 0, rate: 4.75 },
        { over: 4550, overJoint: 9100, rate: 6.75 },
        { over: 11400, overJoint: 22800, rate: 8.75 },
        { over: 125000, overJoint: 250000, rate: 9.9 },
      ],
      bracketsNote: "2026 thresholds are Department of Revenue estimates; final figures come with the 2026 forms.",
      summary:
        "Four brackets: 4.75%, 6.75%, 8.75% and 9.9%. In 2026 the 8.75% rate starts at about $11,400 of taxable income single ($22,800 joint, estimated), and 9.9% applies above $125,000 ($250,000 joint).",
    },
    deductions:
      "Standard deduction for 2025: $2,835 single, $5,670 joint, $4,560 head of household; 2026 estimates are $2,900 / $5,800 / $4,650. Add $1,200 (single or head of household) or $1,000 (others) per 65+/blind box (2025). Personal exemption credit: $256 each for 2025 (about $260 estimated for 2026), not allowed above $100,000 of federal AGI ($200,000 joint).",
    seniorBreaks:
      "The extra standard deduction at 65+. The Retirement Income Credit at 62+: 9% of eligible retirement income if household income is under $22,500 ($45,000 joint) and Social Security is under $7,500 ($15,000 joint). The federal income tax subtraction: up to $8,500 for 2025 (about $8,750 estimated for 2026), phased out between $125,000 and $145,000 of federal AGI ($250,000–$290,000 joint).",
    changes:
      "No rate change enacted. 2025 returns included the surplus “kicker” credit. Final 2026 indexed figures arrive with the 2026 forms (around January 2027). Oregon starts from federal AGI, so the federal $6,000 senior deduction does not carry over.",
    highlights: [
      "Social Security is fully exempt.",
      "Pensions and IRA/401(k) withdrawals are taxed at up to 9.9%.",
      "The 8.75% bracket starts at about $11,400 of taxable income ($22,800 joint).",
      "You can subtract part of the federal income tax you paid.",
      "Federal and military pensions are exempt only for service before October 1, 1991.",
    ],
    metaDescription:
      "Oregon exempts Social Security but taxes pensions and IRA withdrawals at up to 9.9%, with 8.75% starting near $11,400. 2026 senior credits and sources.",
    sources: [
      { label: "Oregon Department of Revenue — 2026 estimated indexed figures (OR-ESTIMATE)", url: "https://www.oregon.gov/dor/forms/FormsPubs/publication-or-estimate_101-026_2026.pdf" },
      { label: "Oregon Department of Revenue — 2025 Form OR-40 instructions", url: "https://www.oregon.gov/dor/forms/FormsPubs/form-or-40-inst_101-040-1_2025.pdf" },
      { label: "Oregon Department of Revenue — 2025 Publication OR-17", url: "https://www.oregon.gov/dor/forms/FormsPubs/publication-or-17_101-431_2025.pdf" },
      { label: "Oregon Department of Revenue — Personal income tax", url: "https://www.oregon.gov/dor/programs/individuals/pages/pit.aspx" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: [
      "Oregon’s 2026 brackets, standard deduction, exemption credit and federal tax subtraction are the Department’s estimates until the 2026 forms are released.",
      "We could not check Oregon’s 2026 short session for retirement changes.",
    ],
  },
  {
    code: "PA",
    name: "Pennsylvania",
    slug: "pennsylvania",
    taxYear: 2026,
    taxYearNote: "The 3.07% rate has applied since 2004; rules come from the 2025 PA-40 instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Pennsylvania does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement benefits are not taxable income in Pennsylvania at all.",
    },
    pensions: {
      taxed: "no",
      summary: "Pensions are not taxed once you’re eligible to retire under the plan and do retire.",
      detail:
        "Commonly recognized pension, old-age or retirement benefits paid after you become eligible to retire, and retire, are not taxable. All distributions from Pennsylvania SERS, PSERS and PMRS and federal civil service annuities are exempt, and so are out-of-state government and private pensions that meet the rules. Payments before you meet the plan’s age or service requirements are taxable to the extent they exceed contributions already taxed, and early-retirement incentive payments count as taxable pay.",
      publicVsPrivate: "Treated the same: exempt after retirement eligibility.",
    },
    iraAnd401k: {
      taxed: "no",
      summary: "IRA withdrawals at 59½ or later and 401(k), 403(b) and 457 payouts after retirement eligibility are not taxed.",
      detail:
        "Before 59½, the part of an IRA withdrawal above contributions already taxed is taxable, and Pennsylvania has none of the federal exceptions. Contributions to IRAs and 401(k)s were never deductible in Pennsylvania, so that money comes back tax-free.",
    },
    military: { taxed: "no", summary: "Military pensions and uniformed-service retired or retainer pay are not taxed." },
    relief: { level: "all", headline: "All retirement income is exempt once you’re of retirement age (59½ for IRAs)." },
    rates: {
      type: "flat",
      topRate: 3.07,
      flatRate: 3.07,
      summary: "A flat 3.07% on Pennsylvania taxable income since 2004. Local earned income taxes apply only to earned income, not retirement income.",
    },
    deductions: "None — Pennsylvania has no standard deduction or personal exemption.",
    seniorBreaks:
      "The retirement-income exemption is the main benefit. Tax Forgiveness (Schedule SP) helps low-income households, and the Property Tax/Rent Rebate program covers people 65+ (we did not verify their 2026 income limits).",
    changes:
      "We found no enacted 2026 change; the rate has been 3.07% since 2004. Pennsylvania doesn’t use federal AGI, so the federal $6,000 senior deduction has no effect.",
    highlights: [
      "Social Security, pensions, IRAs, 401(k)s and military pay are all exempt in retirement.",
      "IRA withdrawals are tax-free from age 59½.",
      "Flat 3.07% rate since 2004.",
      "Local wage taxes don’t apply to retirement income.",
      "No standard deduction or personal exemption.",
    ],
    metaDescription:
      "Pennsylvania exempts Social Security, pensions, IRA withdrawals from 59½, 401(k) payouts and military pay. Other income pays a flat 3.07%. 2026 rules.",
    sources: [
      { label: "Pennsylvania Department of Revenue — 2025 PA-40 instructions", url: "https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforindividuals/pit/documents/2025/2025_pa-40in.pdf" },
      { label: "Pennsylvania Department of Revenue — Personal income tax rates", url: "https://www.pa.gov/agencies/revenue/resources/tax-rates/personal-income-tax-rates" },
      { label: "Pennsylvania Department of Revenue — PA PIT guide: gross compensation", url: "https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/gross-compensation" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["We could not confirm that the 2026–27 state budget made no change to retirement taxation; we found none."],
  },
];
