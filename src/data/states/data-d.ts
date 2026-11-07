/**
 * Rhode Island – Wyoming. Facts: docs/research/states_d.json, checked against docs/research/verify_states_d.json.
 * Verifier corrections applied: SC homestead exemption is $75,000 through June 30, 2027 (not $50,000); WI 2026
 * standard deduction is published (used). Unverifiable items (RI 2026 thresholds, WA 2026 capital-gains deduction)
 * are left out and listed in `notes`. Verifier-supplied missing items used: WV personal exemption and trigger timing,
 * RI pension-modification age test from 2027.
 */
import type { StateTaxInput } from "./types";

const V = "2026-10-23" as const;

export const STATES_D: StateTaxInput[] = [
  {
    code: "RI",
    name: "Rhode Island",
    slug: "rhode-island",
    taxYear: 2026,
    taxYearNote: "2026 brackets and deductions are official; the 2026 income limits for the Social Security and pension breaks are not yet published.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      whoPays: "Anyone below full retirement age, and anyone with AGI of $107,000 or more ($133,750 joint; 2025 limits).",
      summary: "Social Security is exempt only once you reach full retirement age and only if AGI is under the limit ($107,000 single / $133,750 joint for 2025).",
      detail:
        "Taxable Social Security is fully subtracted only if you have reached your Social Security full retirement age (for 2025: born on or before March 1, 1959) and your federal AGI is below the threshold — $107,000 single, head of household or separate, and $133,750 joint for 2025. It’s a cliff: above the limit, none of it is subtracted. The 2026 limits come in the Division of Taxation’s fall advisory and are not yet published. If only one spouse has reached full retirement age, the subtraction is prorated. From 2027 the full-retirement-age requirement is dropped (the income limit stays).",
    },
    pensions: {
      taxed: "partially",
      summary: "At full retirement age, up to $50,000 per person of pension and 401(k) income is subtracted — if AGI is under the limit.",
      detail:
        "From 2025, up to $50,000 per person ($100,000 for a couple) of federally taxable pension and annuity income is subtracted (it was $20,000 for 2023–2024). You must have reached full retirement age and have AGI under the same limit as the Social Security break ($107,000 / $133,750 for 2025; 2026 not yet published). Private, federal, state and local pensions, 401(k), 403(b), governmental 457(b), TSP and annuities qualify. The age test stays for pensions even after 2027.",
      publicVsPrivate: "Same $50,000 cap for both.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA withdrawals are fully taxable; 401(k), 403(b), 457(b) and TSP payouts qualify for the $50,000 pension break.",
      detail: "No income from a traditional, Roth, SEP, SIMPLE or any other IRA qualifies for the pension and annuity subtraction.",
    },
    military: { taxed: "no", summary: "Military service pensions, including survivor benefits, are fully exempt since 2023, with no age or income test." },
    relief: {
      level: "moderate",
      incomeLimited: true,
      headline: "Up to $50,000 per person of pension and 401(k) income — not IRAs — is subtracted at full retirement age, under the income limit.",
    },
    rates: {
      type: "graduated",
      topRate: 5.99,
      brackets: [
        { over: 0, overJoint: 0, rate: 3.75 },
        { over: 82050, overJoint: 82050, rate: 4.75 },
        { over: 186450, overJoint: 186450, rate: 5.99 },
      ],
      summary:
        "Three brackets for every filing status in 2026: 3.75% up to $82,050, 4.75% up to $186,450 and 5.99% above. From 2027 a surtax applies to income over $1 million: 1% in 2027, 2% in 2028 and 3% from 2029.",
    },
    deductions:
      "2026 standard deduction: $11,200 single or separate, $16,800 head of household, $22,400 joint. Personal exemption: $5,250. Both phase out between $261,000 and $290,800 of modified AGI.",
    seniorBreaks:
      "The Social Security and pension subtractions above. The property tax relief credit (Form RI-1040H) was up to $700 for 2025, for households with income up to $40,730.",
    changes:
      "2025: the pension subtraction rose from $20,000 to $50,000 per person. 2026 law (H 7127 Sub A): drops the full-retirement-age test for the Social Security subtraction from 2027 (the income limit stays, and the pension subtraction keeps its age test), adds the millionaire surtax from 2027, and adds a $330 refundable child tax credit from 2027. No change to the pension cap or the rate schedule for 2026.",
    highlights: [
      "Military pensions are fully exempt.",
      "Social Security is exempt only at full retirement age and under the income limit — a cliff.",
      "Up to $50,000 per person of pension and 401(k) income subtracted; IRAs don’t qualify.",
      "Three brackets: 3.75%, 4.75% and 5.99%.",
      "From 2027, no age test for the Social Security break.",
    ],
    metaDescription:
      "Rhode Island exempts Social Security and $50,000 of pension income only at full retirement age and under an income limit; IRAs are taxed. 2026 rates.",
    faqExtra: [
      {
        q: "Does Rhode Island exempt IRA withdrawals?",
        a: "No. The $50,000-per-person pension and annuity subtraction covers pensions, 401(k), 403(b), governmental 457(b) and TSP payouts, but no income from any kind of IRA qualifies. IRA withdrawals are taxed at 3.75% to 5.99% in 2026.",
      },
    ],
    sources: [
      { label: "RI Division of Taxation — ADV 2025-22, inflation adjustments", url: "https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-11/ADV_2025_22_Inflation_Adjustments.pdf" },
      { label: "RI Division of Taxation — 2026 summary of legislative changes", url: "https://tax.ri.gov/sites/g/files/xkgbur541/files/2026-07/2026_summary_of_legislative_changes.pdf" },
      { label: "RI Division of Taxation — Retirement Income Guide (Pub 2026-01)", url: "https://tax.ri.gov/sites/g/files/xkgbur541/files/2026-02/PUB_2026-01_Retirement_Income_Guide.pdf" },
      { label: "RI Division of Taxation — 2025 RI-1040 instructions", url: "https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-12/2025%201040R%20Instructions%20122025.pdf" },
      { label: "RI Division of Taxation — Social Security worksheet", url: "https://tax.ri.gov/sites/g/files/xkgbur541/files/2026-01/Social%20Security%20Worksheet_b.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: [
      "Rhode Island’s 2026 income limits for the Social Security and pension subtractions are not yet published; we show the 2025 limits.",
      "A Division guide prints the 2025 joint limit as $133,500; the forms and the advisory use $133,750, which we show.",
    ],
  },
  {
    code: "SC",
    name: "South Carolina",
    slug: "south-carolina",
    taxYear: 2026,
    taxYearNote: "2026 rates come from Act 110 of 2026 (signed March 30, 2026).",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "South Carolina does not tax Social Security benefits.",
      detail: "Social Security and Railroad Retirement benefits taxed federally are exempt, with no age or income limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "At 65+, up to $10,000 per person of retirement income is deducted, and an age deduction brings the total to $15,000 against any income.",
      detail:
        "The retirement income deduction is up to $3,000 a year before 65 and up to $10,000 a year from the year you turn 65, per person, for the original owner of the plan (inherited accounts don’t qualify; surviving spouses have a separate deduction). It covers plans under IRC sections 401, 403, 408 (IRAs) and 457 and all public employee retirement plans. Separately, each person 65+ gets a $15,000 deduction against any income, reduced by the retirement deduction claimed — so the combined total is $15,000 per person 65+ ($30,000 if both spouses are 65+).",
      publicVsPrivate: "Treated the same.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA, 401(k), 403(b) and 457 withdrawals qualify for the same $3,000 / $10,000 deduction (original owner only), plus the rest of the $15,000 age deduction at 65+.",
      detail: "The remainder is taxable.",
    },
    military: { taxed: "no", summary: "All military retirement pay is exempt at any age, including Reserve and Guard retirement and surviving spouses’ benefits." },
    relief: { level: "moderate", headline: "At 65+, up to $15,000 per person of retirement (or any) income is deducted." },
    rates: {
      type: "graduated",
      topRate: 5.21,
      brackets: [
        { over: 0, overJoint: 0, rate: 1.99 },
        { over: 30000, overJoint: 30000, rate: 5.21 },
      ],
      bracketsNote: "At $30,000 and above, the whole formula is 5.21% of taxable income minus $966, so the 5.21% rate effectively applies only above $30,000.",
      summary:
        "New for 2026: 1.99% on taxable income under $30,000 and 5.21% (minus $966) at $30,000 and above — a 5.21% top rate, down from 6% in 2025. The bracket is indexed. From 2027 the top rate falls only if revenue growth forecasts meet a 5% trigger.",
    },
    deductions:
      "From 2026 South Carolina no longer uses the federal standard or itemized deduction. Instead, the South Carolina Income Adjusted Deduction is $15,000 single or separate, $22,500 head of household and $30,000 joint, shrinking as federal AGI rises and gone at $95,000 single, $142,500 head of household or $190,000 joint. The dependent exemption was $4,930 for 2025.",
    seniorBreaks:
      "The $15,000 age-65 deduction per person. South Carolina does not allow the federal $6,000 senior deduction for 2026. The homestead exemption for people 65+, disabled or blind covers $75,000 of a home’s fair market value — the $50,000 in law plus a temporary $25,000 through June 30, 2027.",
    changes:
      "Act 110 of 2026: new 1.99% / 5.21% brackets, the new income-adjusted deduction, decoupling from the federal standard, itemized, senior, tips, overtime, car-loan and QBI deductions, an EITC cap of $200, and trigger-based cuts from 2027. Unchanged: the retirement, age-65, military and Social Security breaks.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "Up to $15,000 per person of income deducted at 65+ ($30,000 for a couple).",
      "New 2026 rates: 1.99% under $30,000, 5.21% above.",
      "The federal standard and senior deductions no longer apply from 2026.",
      "Homestead exemption of $75,000 at 65+ through June 2027.",
    ],
    metaDescription:
      "South Carolina exempts Social Security and military pay and deducts up to $15,000 per person at 65+. New 2026 rates of 1.99% and 5.21%. Rules and sources.",
    sources: [
      { label: "SC Department of Revenue — Individual income tax", url: "https://dor.sc.gov/iit" },
      { label: "SC Department of Revenue — Information Letter #26-20", url: "https://dor.sc.gov/sites/dor/files/policies/IL26-20.pdf" },
      { label: "SC Legislature — H.4216 (Act 110 of 2026)", url: "https://www.scstatehouse.gov/sess126_2025-2026/bills/4216.htm" },
      { label: "SC Department of Revenue — Retirees: five tips", url: "https://dor.sc.gov/tax-tips/retirees-lower-your-individual-income-tax-bill-these-five-tips" },
      { label: "SC Department of Revenue — Age 65 and older, retirement and military deductions", url: "https://dor.sc.gov/income-tax-age-65-and-older-deduction-general-and-military-retirement-deductions-and-earned-income-offset" },
      { label: "SC Department of Revenue — 2026 tax legislation update", url: "https://dor.sc.gov/administrative-legislative-regulations-tax-legislation-update-2026" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "SD",
    name: "South Dakota",
    slug: "south-dakota",
    taxYear: 2026,
    taxYearNote: "South Dakota does not impose a state income tax.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "South Dakota has no income tax, so Social Security is not taxed.",
      detail: "The South Dakota Department of Revenue confirms the state does not impose a state income tax.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed — South Dakota has no income tax.", detail: "Public and private pensions owe no state income tax." },
    iraAnd401k: { taxed: "no", summary: "IRA and 401(k) withdrawals are not taxed.", detail: "With no income tax, withdrawals and required minimum distributions owe no state tax." },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No income tax, so every kind of retirement income is untaxed by the state." },
    rates: { type: "none", topRate: 0, summary: "No individual income tax. State revenue comes from sales and use and other taxes." },
    deductions: "Not applicable — there is no income tax.",
    seniorBreaks: "Not applicable to income tax. Property-tax relief programs exist but are not covered here.",
    changes: "We found no enacted income tax changes for 2026–2028.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "No individual income tax at all.",
      "We found no income tax changes enacted for 2026–2028.",
    ],
    noTaxNote: "There is no individual income tax; the state relies on sales and use taxes.",
    metaDescription:
      "South Dakota has no state income tax, so Social Security, pensions, IRA and 401(k) withdrawals and military pay are all untaxed. 2026 facts from state sources.",
    sources: [
      { label: "South Dakota Department of Revenue — Taxes for individuals", url: "https://dor.sd.gov/individuals/taxes/" },
      { label: "South Dakota Department of Revenue — 2026 sales and use tax guide", url: "https://dor.sd.gov/media/avyep2sr/2026-7_sales-use-tax-guide.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "TN",
    name: "Tennessee",
    slug: "tennessee",
    taxYear: 2026,
    taxYearNote: "Tennessee has no individual income tax; the Hall tax on interest and dividends ended in 2021.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Tennessee has no income tax on wages or retirement income, so Social Security is not taxed.",
      detail: "The Hall tax on interest and dividends — which never applied to Social Security — was repealed for tax periods beginning on or after January 1, 2021.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed.", detail: "Tennessee has no income tax on wages, pensions or retirement income." },
    iraAnd401k: { taxed: "no", summary: "IRA and 401(k) withdrawals are not taxed.", detail: "With the Hall tax repealed from 2021, interest and dividends aren’t taxed either." },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No individual income tax, so every kind of retirement income is untaxed by the state." },
    rates: { type: "none", topRate: 0, summary: "No individual income tax since the Hall tax on interest and dividends was repealed for 2021 and later." },
    deductions: "Not applicable — there is no individual income tax.",
    seniorBreaks: "Not applicable to income tax. Property tax relief and freeze programs exist but are not covered here.",
    changes: "None affecting income tax for 2026–2028.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "The Hall tax on interest and dividends ended in 2021.",
      "No state tax on investment income either.",
    ],
    noTaxNote: "The Hall tax on interest and dividends ended in 2021, so no income is taxed.",
    metaDescription:
      "Tennessee has no individual income tax — the Hall tax ended in 2021 — so Social Security, pensions, IRA withdrawals and military pay are untaxed. 2026 facts.",
    sources: [
      { label: "Tennessee Department of Revenue — Hall income tax", url: "https://www.tn.gov/revenue/taxes/hall-income-tax.html" },
      { label: "Tennessee Department of Revenue — HIT-3: Hall tax repealed from January 1, 2021", url: "https://revenue.support.tn.gov/hc/en-us/articles/360057828631-HIT-3-Hall-Income-Tax-Repealed-Beginning-January-1-2021" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "TX",
    name: "Texas",
    slug: "texas",
    taxYear: 2026,
    taxYearNote: "Texas has no individual income tax, and its constitution prohibits one.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Texas has no individual income tax, so Social Security is not taxed.",
      detail: "The Texas Constitution (Art. VIII, Sec. 24-a, added in 2019) prohibits a tax on the net incomes of individuals.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed — Texas has no individual income tax.", detail: "Public and private pensions owe no state income tax." },
    iraAnd401k: { taxed: "no", summary: "IRA and 401(k) withdrawals are not taxed.", detail: "With no individual income tax, withdrawals and required minimum distributions owe no state tax." },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No individual income tax, so every kind of retirement income is untaxed by the state." },
    rates: {
      type: "none",
      topRate: 0,
      summary:
        "No individual income tax. The Texas Constitution also bars a capital gains tax on individuals (added November 4, 2025) and a wealth tax. The franchise tax applies to businesses, not to individuals or sole proprietors.",
    },
    deductions: "Not applicable — there is no individual income tax.",
    seniorBreaks: "Not applicable to income tax. Texas offers property-tax homestead exemptions and freezes for people 65+ (not covered in detail here).",
    changes: "A November 4, 2025 constitutional amendment added a ban on capital gains taxes for individuals. There is no income tax change for 2026–2028.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "The state constitution bans a personal income tax.",
      "A 2025 amendment also bans a capital gains tax on individuals.",
    ],
    noTaxNote: "The constitution bans a personal income tax and, since 2025, a capital gains tax on individuals.",
    metaDescription:
      "Texas has no individual income tax and its constitution bans one, so Social Security, pensions, IRA and 401(k) withdrawals and military pay are all untaxed.",
    sources: [
      { label: "Texas Legislature — Texas Constitution, Article 8", url: "https://tcss.legis.texas.gov/resources/CN/pdf/CN.8.pdf" },
      { label: "Texas Legislature — Constitution Art. VIII, Sec. 24-a", url: "https://statutes.capitol.texas.gov/docviewer/?docName=CN.8.24-a.htm" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "UT",
    name: "Utah",
    slug: "utah",
    taxYear: 2026,
    taxYearNote: "The 2026 rate comes from SB 60 (2026), retroactive to January 1, 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      whoPays: "Filers with modified AGI above $54,000 single or $90,000 joint, where the offsetting credit phases out (limits not indexed).",
      summary: "Utah taxes Social Security, but a credit offsets that tax for single filers with modified AGI up to $54,000 ($90,000 joint).",
      detail:
        "Social Security that is taxable federally is included in Utah income, but a nonrefundable credit equal to the 4.45% rate times the benefits in Utah taxable income offsets the tax. The credit shrinks by 2.5 cents for each dollar of modified AGI over $54,000 single, $45,000 married filing separately, $90,000 head of household or $90,000 joint (raised in 2025; not indexed). You can’t claim it in the same year as the $450 retirement credit. From 2026 you can also subtract Social Security you had to repay.",
    },
    pensions: {
      taxed: "yes",
      summary: "Pensions are fully taxable at 4.45%; only people born in 1952 or earlier can get a $450 retirement credit.",
      detail:
        "Public and private pensions are taxed with no pension exclusion. The $450 nonrefundable retirement credit is for those born on or before December 31, 1952, and shrinks by 2.5 cents per $1 of modified AGI over $25,000 single, $16,000 separate or $32,000 joint or head of household. It can’t be combined with the Social Security or military credits.",
      publicVsPrivate: "Treated the same: taxable.",
    },
    iraAnd401k: {
      taxed: "yes",
      summary: "IRA and 401(k) withdrawals are fully taxable at 4.45%.",
      detail: "The only relief is the $450 credit for those born in 1952 or earlier.",
    },
    military: { taxed: "no", summary: "A credit equal to 4.45% of military retirement pay (including Survivor Benefit Plan income) effectively exempts it." },
    relief: { level: "narrow", headline: "No pension or IRA exclusion — only a $450 credit for people born in 1952 or earlier." },
    rates: { type: "flat", topRate: 4.45, flatRate: 4.45, summary: "A flat 4.45% for 2026 (4.5% in 2025, 4.55% in 2024)." },
    deductions:
      "No standard deduction. Instead, a taxpayer tax credit equals 6% of your federal standard (or itemized) deduction plus Utah personal exemptions, phased out at 1.3% of income above a base ($18,213 single, $36,426 joint for 2025; 2026 amounts not located). The federal $6,000 senior deduction has no effect on the Utah return.",
    seniorBreaks:
      "The Social Security credit (income-limited), the $450 retirement credit for those born in 1952 or earlier, and the military retirement credit. The federal 65+ standard deduction add-on still feeds the 6% taxpayer credit.",
    changes:
      "2025: the rate was cut to 4.5% and the Social Security credit limits were raised (now based on Utah taxable income). 2026: SB 60 cut the rate to 4.45% retroactive to January 1; HB 60 added a subtraction for repaid Social Security. No full Social Security exemption was enacted.",
    highlights: [
      "Social Security is taxed, but a credit offsets it below $54,000 of modified AGI ($90,000 joint).",
      "Pensions and IRA/401(k) withdrawals are taxed at a flat 4.45%.",
      "Military retirement pay is effectively exempt through a credit.",
      "A $450 retirement credit applies only to people born in 1952 or earlier.",
      "Rate cut to 4.45% for 2026.",
    ],
    metaDescription:
      "Utah taxes Social Security, but a credit offsets it below $54,000 ($90,000 joint); pensions and IRA withdrawals pay a flat 4.45%. 2026 credits and limits.",
    sources: [
      { label: "Utah Code §59-10-104 — Tax rate (2026)", url: "https://le.utah.gov/xcode/title59/chapter10/C59-10-S104_2026050620260506.pdf" },
      { label: "Utah Legislature — SB 60 (2026), enrolled", url: "https://le.utah.gov/Session/2026/bills/enrolled/SB0060.pdf" },
      { label: "Utah Code §59-10-1042 — Social Security benefits credit", url: "https://le.utah.gov/xcode/Title59/Chapter10/C59-10-S1042_2026010120250507.pdf" },
      { label: "Utah Code §59-10-1019 — Retirement credit", url: "https://le.utah.gov/xcode/Title59/Chapter10/C59-10-S1019_2022032320220323.pdf" },
      { label: "Utah Code §59-10-1043 — Military retirement credit", url: "https://le.utah.gov/xcode/Title59/Chapter10/C59-10-S1043_2022032320220323.pdf" },
      { label: "Utah State Tax Commission — January 2026 practitioner webinar", url: "https://files.tax.utah.gov/tax/train/webinars/2026-01-15-presentation.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Utah’s 2026 taxpayer-credit phase-out base amounts were not located; we show the 2025 figures."],
  },
  {
    code: "VT",
    name: "Vermont",
    slug: "vermont",
    taxYear: 2026,
    taxYearNote: "The 2026 rate schedule is labeled preliminary by the Department of Taxes; exclusion limits are set in law.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "partially",
      whoPays: "Filers with federal AGI over $55,000 ($70,000 joint); none is excluded at $65,000 ($80,000 joint) or more.",
      summary: "Social Security is fully exempt up to $55,000 of AGI ($70,000 joint), partly exempt up to $65,000 ($80,000 joint), and taxed above that.",
      detail:
        "Single, separate, head of household and surviving spouse filers: fully excluded at federal AGI of $55,000 or less, partly between $55,000 and $65,000, not at all at $65,000 or more. Joint filers: fully excluded at $70,000 or less, partly between $70,000 and $80,000, not at all at $80,000 or more. The partial amount is your taxable benefits × (upper limit − AGI) ÷ $10,000. These limits are not indexed. You must choose only one of the Social Security, CSRS or non-Social-Security public pension exclusions; the military exclusion can be added on top.",
    },
    pensions: {
      taxed: "yes",
      summary: "Private pensions and most public pensions are fully taxable; up to $10,000 of a CSRS or non-Social-Security public pension can be excluded instead of the Social Security exclusion.",
      detail:
        "The first $10,000 of Civil Service Retirement System income, or of other federal, state or local contributory pensions from work not covered by Social Security, is excluded under the same AGI phase-out ($55,000–$65,000 single, $70,000–$80,000 joint), in place of the Social Security exclusion. Railroad Retirement is exempt.",
      publicVsPrivate: "Private pensions: taxed. CSRS and other non-Social-Security public pensions: $10,000 exclusion at moderate incomes.",
    },
    iraAnd401k: { taxed: "yes", summary: "IRA and 401(k) withdrawals are fully taxable.", detail: "Vermont has no IRA or 401(k) exclusion." },
    military: {
      taxed: "partially",
      summary: "Military retirement and survivor benefit income is fully excluded at federal AGI of $125,000 or less, partly excluded up to $175,000, and taxed above that (any filing status).",
    },
    relief: { level: "narrow", headline: "No pension or IRA exclusion, apart from $10,000 of a CSRS or non-Social-Security public pension at moderate incomes." },
    rates: {
      type: "graduated",
      topRate: 8.75,
      brackets: [
        { over: 0, overJoint: 0, rate: 3.35 },
        { over: 50750, overJoint: 84700, rate: 6.6 },
        { over: 122850, overJoint: 204750, rate: 7.6 },
        { over: 256300, overJoint: 312050, rate: 8.75 },
      ],
      bracketsNote: "The Vermont Department of Taxes labels the 2026 brackets preliminary.",
      summary: "Four brackets for 2026: 3.35%, 6.6%, 7.6% and 8.75%. The 6.6% rate starts at $50,750 single ($84,700 joint); 8.75% applies above $256,300 ($312,050 joint).",
    },
    deductions:
      "2025 standard deduction: $7,650 single or separate, $11,450 head of household, $15,300 joint, plus $1,250 per 65+/blind box. Personal exemption: $5,300 (2025). The 2026 amounts are not yet published.",
    seniorBreaks:
      "The extra $1,250 standard deduction at 65+, and the Social Security, CSRS and military exclusions. Act 169 of 2026 raises the homestead property tax credit — income limit $47,000 to $50,000 and maximum state credit $5,600 to $6,000 — for claims filed from 2027.",
    changes:
      "Act 71 (2025) raised the Social Security and CSRS limits by $5,000 and added the military exclusion from 2025. The 2026 session (Act 164) updated federal conformity with no change to retirement exclusions or rates; Act 169 expands property tax and renter credits for 2027 claims.",
    highlights: [
      "Social Security exempt up to $55,000 of AGI ($70,000 joint), phased out by $65,000 ($80,000).",
      "Pensions and IRA/401(k) withdrawals are fully taxed.",
      "Military retirement is exempt up to $125,000 of AGI, phased out by $175,000.",
      "Rates of 3.35% to 8.75%; 6.6% starts at $50,750 single.",
      "Bigger homestead property tax credit for 2027 claims.",
    ],
    metaDescription:
      "Vermont exempts Social Security up to $55,000 AGI ($70,000 joint), then phases it out; pensions and IRA withdrawals are taxed at up to 8.75%. 2026 rules.",
    sources: [
      { label: "Vermont Legislature — 32 V.S.A. §5830e (retirement exclusions)", url: "https://legislature.vermont.gov/statutes/section/32/151/05830e" },
      { label: "Vermont Department of Taxes — Social Security exemption", url: "https://tax.vermont.gov/individuals/income-tax-returns/social-security-exemption" },
      { label: "Vermont Department of Taxes — 2026 IN-114 instructions (preliminary rates)", url: "https://tax.vermont.gov/sites/tax/files/documents/IN-114-Instr-2026.pdf" },
      { label: "Vermont Department of Taxes — 2026 rate schedules", url: "https://tax.vermont.gov/document/2026-vt-rate-schedules" },
      { label: "Vermont Department of Taxes — 2025 income tax booklet", url: "https://tax.vermont.gov/sites/tax/files/documents/Income-Booklet-2025.pdf" },
      { label: "Vermont Department of Taxes — 2026 tax legislation", url: "https://tax.vermont.gov/tax-law-and-guidance/tax-legislation/2026" },
      { label: "Vermont Department of Taxes — Military personnel", url: "https://tax.vermont.gov/individuals/income-tax-returns/who-needs-to-file/military-personnel" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Vermont’s 2026 rate schedule is preliminary, and its 2026 standard deduction and exemption amounts aren’t published yet; we show 2025 amounts."],
  },
  {
    code: "VA",
    name: "Virginia",
    slug: "virginia",
    taxYear: 2026,
    taxYearNote: "Rates and deductions come from the Code of Virginia, current for 2026.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Virginia does not tax Social Security benefits.",
      detail: "Social Security benefits (and Tier 1 Railroad Retirement) are subtracted, with no age or income limit.",
    },
    pensions: {
      taxed: "partially",
      summary: "Pensions are taxable, but each person 65+ can take an age deduction of up to $12,000, reduced at higher incomes.",
      detail:
        "Virginia has no pension exclusion. The age deduction is $12,000 per person 65+. If you were born on or before January 1, 1939 you get the full amount regardless of income; otherwise it’s reduced $1 for every $1 of “adjusted federal AGI” (AGI minus taxable Social Security) over $50,000 single or $75,000 married. It isn’t indexed and can’t be combined with the disability income subtraction.",
      publicVsPrivate: "Treated the same: taxable, with the age deduction.",
    },
    iraAnd401k: { taxed: "partially", summary: "IRA and 401(k) withdrawals are taxable; the same income-tested age deduction applies.", detail: "There is no IRA- or 401(k)-specific exclusion." },
    military: {
      taxed: "partially",
      summary: "Up to $40,000 a year of military benefits can be subtracted at any age from 2025 (Medal of Honor recipients’ retirement pay is fully exempt). It can be combined with the age deduction; CSRS and FERS pensions don’t qualify.",
    },
    relief: { level: "moderate", incomeLimited: true, headline: "An age deduction of up to $12,000 per person 65+, phased out above $50,000 ($75,000 married) of adjusted AGI." },
    rates: {
      type: "graduated",
      topRate: 5.75,
      brackets: [
        { over: 0, overJoint: 0, rate: 2 },
        { over: 3000, overJoint: 3000, rate: 3 },
        { over: 5000, overJoint: 5000, rate: 5 },
        { over: 17000, overJoint: 17000, rate: 5.75 },
      ],
      summary: "Four brackets for all filers, unchanged since 1990: 2% on the first $3,000, 3% to $5,000, 5% to $17,000 and 5.75% above $17,000.",
    },
    deductions:
      "Standard deduction: $8,750 single and $17,500 married for 2025–2026; $9,200 / $18,400 for 2027 and $9,300 / $18,600 for 2028–2029, then back to $3,000 / $6,000 from 2030 unless changed. Personal exemption: $930 each, plus $800 more for each person 65+ or blind.",
    seniorBreaks:
      "The age deduction (up to $12,000 per person 65+, income-tested) and the extra $800 exemption. Virginia starts from federal AGI, so the federal $6,000 senior deduction does not apply.",
    changes:
      "2026 session: federal conformity fixed at December 31, 2025; the standard deduction extended and raised for 2027–2029; the refundable earned income credit extended through 2029. No change to the age deduction, the $40,000 military subtraction or the rates for 2026.",
    highlights: [
      "Social Security is fully exempt.",
      "Age deduction of up to $12,000 per person 65+, phased out above $50,000 ($75,000 married).",
      "Up to $40,000 of military retirement pay subtracted, at any age.",
      "The 5.75% top rate applies above just $17,000 of taxable income.",
      "Standard deduction of $8,750 single / $17,500 married in 2026.",
    ],
    metaDescription:
      "Virginia exempts Social Security and offers a $12,000 age deduction at 65+ (income-tested) and a $40,000 military subtraction. Top rate 5.75%. 2026 rules.",
    sources: [
      { label: "Code of Virginia §58.1-322.03 — Deductions", url: "https://law.lis.virginia.gov/vacode/title58.1/chapter3/section58.1-322.03/" },
      { label: "Code of Virginia §58.1-322.02 — Subtractions", url: "https://law.lis.virginia.gov/vacode/title58.1/chapter3/section58.1-322.02/" },
      { label: "Code of Virginia §58.1-320 — Tax rates", url: "https://law.lis.virginia.gov/vacode/title58.1/chapter3/section58.1-320/" },
      { label: "Virginia Tax — 2026 legislative summary", url: "https://www.tax.virginia.gov/sites/default/files/inline-files/2026-legislative-summary.pdf" },
      { label: "Virginia Tax — Military benefits FAQ", url: "https://www.tax.virginia.gov/military-benefits-faq" },
      { label: "Virginia Tax — Virginia taxes and your retirement", url: "https://www.tax.virginia.gov/news/virginia-taxes-and-your-retirement" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "WA",
    name: "Washington",
    slug: "washington",
    taxYear: 2026,
    taxYearNote: "Washington has no broad income tax in 2026; a capital gains excise tax applies, and a 9.9% tax on income over $1 million starts in 2028.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Washington doesn’t tax Social Security in 2026.",
      detail:
        "There is no broad individual income tax in 2026. From January 1, 2028, the new 9.9% tax on income over $1 million (ESSB 6346) starts from federal AGI, so taxable Social Security would count toward it — but only income above the $1 million standard deduction is taxed.",
    },
    pensions: {
      taxed: "no",
      summary: "Pensions are not taxed in 2026.",
      detail: "From 2028, pension income will count toward the new 9.9% tax on income above $1 million; the law says pension income is not exempt from it.",
    },
    iraAnd401k: {
      taxed: "no",
      summary: "IRA and 401(k) withdrawals are not taxed, and the capital gains tax doesn’t apply inside retirement accounts.",
      detail:
        "Washington’s capital gains excise tax does not apply to transactions in 401(k), 403(b), 457, traditional or Roth IRAs or other employer plans. From 2028, distributions included in federal AGI count toward the 9.9% tax base above $1 million.",
    },
    military: { taxed: "no", summary: "Military retirement pay is not taxed in 2026. From 2028 it would count toward income for the new tax on income over $1 million; we found no specific exemption." },
    relief: { level: "all", headline: "No broad income tax in 2026, and retirement accounts are exempt from the capital gains tax." },
    rates: {
      type: "none",
      topRate: 0,
      summary:
        "No broad income tax in 2026. A capital gains excise tax applies to individuals’ long-term gains above a standard deduction ($278,000 for 2025; the 2026 amount isn’t published): 7% on the first $1 million of taxable gains and 9.9% above. Real estate and retirement accounts are exempt. From January 1, 2028, a 9.9% tax applies to income over a $1 million standard deduction (spouses share one $1 million deduction); the law voids itself if a court strikes the tax down.",
    },
    deductions:
      "No income tax in 2026. The capital gains tax standard deduction was $278,000 for 2025. The 2028 income tax will have a $1 million standard deduction per individual (one shared by spouses) and a charitable deduction capped at $100,000.",
    seniorBreaks: "None under an income tax. Senior property-tax exemption and deferral programs exist but are not covered here.",
    changes:
      "2025 (SB 5813): a 9.9% capital gains rate on gains over $1 million from 2025. 2026 (ESSB 6346, effective June 11, 2026): a 9.9% tax on income over $1 million from January 1, 2028, with first returns due in 2029; pension income isn’t exempt. Court challenges are possible.",
    highlights: [
      "No tax on Social Security, pensions, IRA withdrawals or military pay in 2026.",
      "Trades inside IRAs and 401(k)s are exempt from the capital gains tax.",
      "7% / 9.9% capital gains tax on large long-term gains outside retirement accounts.",
      "From 2028, a 9.9% tax on income above $1 million — pensions included.",
      "The 2028 tax has a $1 million standard deduction (one per couple).",
    ],
    noTaxNote: "There is no broad income tax in 2026, but a capital gains tax applies and a 9.9% tax on income over $1 million starts in 2028.",
    metaDescription:
      "Washington doesn’t tax Social Security, pensions or IRA withdrawals in 2026. A capital gains tax applies, and a 9.9% tax on income over $1M starts in 2028.",
    faqExtra: [
      {
        q: "Will Washington tax my retirement income in 2028?",
        a: "Only if your income is over $1 million. ESSB 6346 imposes a 9.9% tax on income above a $1 million standard deduction from January 1, 2028 (spouses share one $1 million deduction). It starts from federal AGI and says pension income is not exempt. The law voids itself if a court strikes the tax down.",
      },
    ],
    sources: [
      { label: "Washington Department of Revenue — Capital gains tax", url: "https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax" },
      { label: "Washington Department of Revenue — New tiered rates for the capital gains tax", url: "https://dor.wa.gov/forms-publications/publications-subject/special-notices/new-tiered-rates-washingtons-capital-gains-tax" },
      { label: "Washington Department of Revenue — Do you owe capital gains tax?", url: "https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax/do-you-owe-capital-gains-tax" },
      { label: "Washington Department of Revenue — Capital gains tax FAQ", url: "https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax/frequently-asked-questions-about-washingtons-capital-gains-tax" },
      { label: "Washington Legislature — ESSB 6346 final bill report", url: "https://lawfilesext.leg.wa.gov/biennium/2025-26/Pdf/Bill%20Reports/Senate/6346-S.E%20SBR%20FBR%2026.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
    notes: ["Washington’s 2026 capital gains standard deduction isn’t published yet, so we show only the 2025 figure.", "We did not check the status of any court challenge to the 2028 income tax."],
  },
  {
    code: "WV",
    name: "West Virginia",
    slug: "west-virginia",
    taxYear: 2026,
    taxYearNote: "2026 rates come from SB 392 (signed March 31, 2026), retroactive to January 1.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "West Virginia no longer taxes Social Security benefits, for anyone, starting in 2026.",
      detail:
        "For 2026, 100% of federally taxable Social Security is subtracted for everyone, regardless of income. Before 2026 the full subtraction applied only up to $50,000 of AGI single or $100,000 joint, with 35% above that in 2024 and 65% in 2025.",
    },
    pensions: {
      taxed: "partially",
      summary: "The first $2,000 of state, teacher and federal pensions is exempt, police and fire pensions are fully exempt, and at 65+ an $8,000 deduction covers any income.",
      detail:
        "The first $2,000 per person of benefits from West Virginia PERS, the Teachers Retirement System and federal retirement systems is subtracted. West Virginia police, firefighter, State Police and deputy sheriff pensions are fully exempt. Other public and private pensions are taxable, but the $8,000-per-person modification at 65+ (or if permanently disabled) applies to income from any source, reduced by the other retirement subtractions you claim.",
      publicVsPrivate: "Certain public pensions get $2,000 (police and fire: all); private pensions rely on the $8,000 at 65+.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and 401(k) withdrawals are taxable, but at 65+ the $8,000-per-person modification can cover them.",
      detail: "The $8,000 is reduced by any Social Security, public pension, police/fire and military subtractions you claim.",
    },
    military: { taxed: "no", summary: "Military retirement pay — regular, Reserve and National Guard, and the other uniformed services — is fully exempt." },
    relief: { level: "small", headline: "At 65+, $8,000 per person of any income is exempt (reduced by other retirement subtractions), plus $2,000 of certain public pensions." },
    rates: {
      type: "graduated",
      topRate: 4.58,
      brackets: [
        { over: 0, overJoint: 0, rate: 2.11 },
        { over: 10000, overJoint: 10000, rate: 2.81 },
        { over: 25000, overJoint: 25000, rate: 3.16 },
        { over: 40000, overJoint: 40000, rate: 4.22 },
        { over: 60000, overJoint: 60000, rate: 4.58 },
      ],
      bracketsNote: "Single, joint and head of household filers share one table; married filing separately uses half-size brackets.",
      summary: "Five brackets for 2026 after a 5% cut: 2.11% up to $10,000, then 2.81%, 3.16%, 4.22% and 4.58% above $60,000. 2025 rates ran from 2.22% to 4.82%.",
    },
    deductions:
      "No standard deduction; personal exemptions of $2,000 each (a surviving spouse gets an extra $2,000 for two years after the death). The $8,000 senior modification works much like a standard deduction.",
    seniorBreaks:
      "The $8,000-per-person modification at 65+ or if disabled, and the full Social Security exemption from 2026. Homestead and senior property-tax credits exist but aren’t covered here.",
    changes:
      "HB 4880 (2024) phased in the full Social Security exemption, reaching everyone in 2026. SB 392 (2026) cut rates 5% retroactive to January 1, 2026. Further cuts can follow if revenue beats an inflation-adjusted base; any cut from an August 2026 finding would apply from 2028 at the earliest.",
    highlights: [
      "New for 2026: Social Security is fully exempt for everyone.",
      "Military retirement and police/fire pensions are fully exempt.",
      "At 65+, $8,000 per person of any income is exempt.",
      "Rates cut 5% for 2026 — top rate 4.58% above $60,000.",
      "Other public and private pensions are taxed beyond the small exclusions.",
    ],
    metaDescription:
      "West Virginia stops taxing Social Security for everyone in 2026, exempts military pay and gives $8,000 per person at 65+. Rates cut to 2.11% to 4.58%.",
    sources: [
      { label: "WV Tax Division — Personal income tax reduction bill", url: "https://tax.wv.gov/Individuals/Pages/PersonalIncomeTaxReductionBill.aspx" },
      { label: "West Virginia Code §11-21-4j — 2026 rates", url: "https://code.wvlegislature.gov/pdf/11-21-4J/" },
      { label: "West Virginia Code §11-21-4i — 2025 rates", url: "https://code.wvlegislature.gov/pdf/11-21-4I/" },
      { label: "West Virginia Code §11-21-12 — Modifications", url: "https://code.wvlegislature.gov/pdf/11-21-12/" },
      { label: "WV Tax Division — Senior citizen Social Security modification", url: "https://tax.wv.gov/Individuals/SeniorCitizens/Pages/SeniorCitizenSocialSecurityModification.aspx" },
      { label: "West Virginia Code §11-21-4h — Future rate reductions", url: "https://code.wvlegislature.gov/pdf/11-21-4H/" },
      { label: "West Virginia Code §11-21-16 — Personal exemptions", url: "https://code.wvlegislature.gov/pdf/11-21-16/" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "WI",
    name: "Wisconsin",
    slug: "wisconsin",
    taxYear: 2026,
    taxYearNote: "2026 brackets and standard deduction come from the 2026 Form 1-ES instructions.",
    hasBroadIncomeTax: true,
    socialSecurity: {
      taxed: "no",
      summary: "Wisconsin does not tax Social Security benefits.",
      detail: "Social Security benefits are not taxable by Wisconsin; Tier 1 Railroad Retirement is exempt too.",
    },
    pensions: {
      taxed: "partially",
      summary: "At 67+, up to $24,000 per person of retirement income is subtracted ($48,000 if both spouses qualify) — but you give up Wisconsin tax credits that year.",
      detail:
        "From 2025, a person who is at least 67 by year-end can subtract up to $24,000 of qualifying retirement income from qualified plans and IRAs, public or private. A joint return gets $48,000 if both spouses are 67+; if only one is, the cap is $24,000 of that spouse’s income. If you claim it, you can’t claim any Wisconsin tax credits that year (including carryforwards). Separately: $5,000 per person at 65+ if federal AGI is under $15,000 single or $30,000 married, and full exemption for federal CSRS and certain pre-1964 Milwaukee and teacher system accounts.",
      publicVsPrivate: "Treated the same.",
    },
    iraAnd401k: {
      taxed: "partially",
      summary: "IRA and qualified-plan withdrawals qualify for the $24,000 subtraction at 67+ (credits forfeited) or the low-income $5,000 subtraction at 65+.",
      detail: "Amounts above the subtraction are taxed at regular rates.",
    },
    military: { taxed: "no", summary: "Military and uniformed services retirement pay (including Coast Guard, NOAA and PHS) is fully exempt." },
    relief: { level: "large", headline: "At 67+, up to $24,000 per person of pension and IRA income is subtracted ($48,000 for a couple), if you give up Wisconsin credits." },
    rates: {
      type: "graduated",
      topRate: 7.65,
      brackets: [
        { over: 0, overJoint: 0, rate: 3.5 },
        { over: 15110, overJoint: 20150, rate: 4.4 },
        { over: 51950, overJoint: 69260, rate: 5.3 },
        { over: 332720, overJoint: 443630, rate: 7.65 },
      ],
      summary: "Four indexed brackets for 2026: 3.5%, 4.4%, 5.3% and 7.65%. The 5.3% rate covers $51,950 to $332,720 of taxable income single ($69,260 to $443,630 joint).",
    },
    deductions:
      "Sliding-scale standard deduction for 2026: $13,960 single, reduced by 12% of income over $20,120 and gone at $136,453; $25,840 joint, reduced by 19.778% over $29,040 and gone at $159,690; $18,030 head of household; $12,280 separate. Personal exemption: $700 per person, plus $250 for each filer 65+.",
    seniorBreaks:
      "The $24,000 / $48,000 subtraction at 67+ (credits forfeited), the $5,000 low-income subtraction at 65+, and the extra $250 exemption. Wisconsin does not adopt the federal $6,000 senior deduction.",
    changes:
      "2025 Act 15 created the 67+ retirement subtraction and widened the 4.4% bracket, both from 2025. 2025 Act 174 (April 2, 2026) clarified the age and credit rules. A May 2026 special-session tax bill and a rebate plan failed.",
    highlights: [
      "Social Security and military retirement pay are fully exempt.",
      "At 67+, up to $24,000 per person of pension and IRA income subtracted ($48,000 for a couple).",
      "Claiming it means giving up Wisconsin tax credits that year — run the numbers both ways.",
      "Rates of 3.5% to 7.65%.",
      "Federal CSRS pensions are fully exempt.",
    ],
    metaDescription:
      "Wisconsin exempts Social Security and military pay, and at 67+ subtracts up to $24,000 per person of pension and IRA income. Rates 3.5% to 7.65% in 2026.",
    faqExtra: [
      {
        q: "Should I take Wisconsin’s $24,000 retirement subtraction?",
        a: "Usually, if you’re 67 or older and have pension or IRA income — but compare both ways. Claiming the subtraction means you can’t claim any Wisconsin tax credits that year, including carryforwards. If your credits are worth more than the tax saved on up to $24,000 ($48,000 for a couple), skip it.",
      },
    ],
    sources: [
      { label: "Wisconsin Department of Revenue — Publication 126, retirement income", url: "https://www.revenue.wi.gov/DOR%20Publications/pb126.pdf" },
      { label: "Wisconsin Department of Revenue — 2025 Schedule M instructions", url: "https://www.revenue.wi.gov/TaxForms2025/2025-ScheduleM-Inst.pdf" },
      { label: "Wisconsin Department of Revenue — 2026 Form 1-ES instructions", url: "https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf" },
      { label: "Wisconsin Department of Revenue — 2025 Form 1 instructions", url: "https://www.revenue.wi.gov/TaxForms2025/2025-Form1-Inst.pdf" },
      { label: "Wisconsin Department of Revenue — Wisconsin Tax Bulletin 233", url: "https://www.revenue.wi.gov/WisconsinTaxBulletin/233-04-30-WTB.pdf" },
      { label: "Wisconsin Legislature — 2025 Act 174", url: "https://docs.legis.wisconsin.gov/2025/related/acts/174.pdf" },
    ],
    confidence: "high",
    lastVerified: V,
  },
  {
    code: "WY",
    name: "Wyoming",
    slug: "wyoming",
    taxYear: 2026,
    taxYearNote: "Wyoming has no individual or corporate income tax.",
    hasBroadIncomeTax: false,
    socialSecurity: {
      taxed: "no",
      summary: "Wyoming has no individual income tax, so Social Security is not taxed.",
      detail: "The State of Wyoming does not have an individual or corporate income tax.",
    },
    pensions: { taxed: "no", summary: "Pensions are not taxed — Wyoming has no individual income tax.", detail: "Public and private pensions owe no state income tax." },
    iraAnd401k: { taxed: "no", summary: "IRA and 401(k) withdrawals are not taxed.", detail: "With no individual income tax, withdrawals and required minimum distributions owe no state tax." },
    military: { taxed: "no", summary: "Military retirement pay is not taxed." },
    relief: { level: "all", headline: "No individual income tax, so every kind of retirement income is untaxed by the state." },
    rates: { type: "none", topRate: 0, summary: "No individual income tax and no corporate income tax." },
    deductions: "Not applicable — there is no individual income tax.",
    seniorBreaks: "Not applicable to income tax. The Department of Revenue runs a Property Tax Refund Program (not covered in detail here).",
    changes: "No income tax enacted for 2026–2028; past proposals did not pass.",
    highlights: [
      "No state tax on Social Security, pensions, IRA withdrawals or military pay.",
      "No individual or corporate income tax.",
      "A state Property Tax Refund Program is open to qualifying residents.",
    ],
    noTaxNote: "There is no individual or corporate income tax.",
    metaDescription:
      "Wyoming has no individual or corporate income tax, so Social Security, pensions, IRA and 401(k) withdrawals and military pay are untaxed. 2026 facts.",
    sources: [
      { label: "State of Wyoming — About Wyoming", url: "https://www.wyo.gov/about-wyoming" },
      { label: "Office of the Governor — Property Tax Refund Program release", url: "https://governor.wyo.gov/news-releases/governor-gordon-urges-property-tax-refund-program-applications" },
      { label: "Wyoming Department of Revenue", url: "https://revenue.wyo.gov/" },
    ],
    confidence: "high",
    lastVerified: V,
  },
];
