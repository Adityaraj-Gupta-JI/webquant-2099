import type { SourceDocument } from './types';

/** ────────────────────────────────────────────────────────────────────────────
 *  SYNTHETIC DISCLOSURE CORPUS
 *
 *  Every document here is written for this prototype. It is modelled on the
 *  structure of Indian listed-company disclosure (annual report, quarterly
 *  result, exchange/regulatory filing) and is internally consistent with the
 *  fundamentals in `src/data/demoData.ts`, but it is NOT real filing text and
 *  no figure in it should be treated as a real disclosure.
 *
 *  `synthetic: true` propagates all the way to the citation shown to the user.
 *  ──────────────────────────────────────────────────────────────────────────── */

export const CORPUS: SourceDocument[] = [
  // ── RELIANCE ──────────────────────────────────────────────────────────────
  {
    documentId: 'ril_annual_report_2025',
    title: 'Reliance Industries — Annual Report FY2025 (synthetic)',
    company: 'Reliance Industries Ltd.',
    ticker: 'RELIANCE',
    documentType: 'annual_report',
    source: 'Synthetic annual report',
    sourceUrl: 'webquant://corpus/ril_annual_report_2025',
    publishedAt: '2025-06-18',
    synthetic: true,
    sections: [
      {
        heading: 'Management Discussion — Segment Performance',
        page: 34,
        body: 'Consolidated revenue grew 8.4% year on year, led by the retail and digital services segments. Retail revenue expanded in the low teens on store additions and higher footfall per store. The oil-to-chemicals segment recorded flat volumes with realisations compressing through the second half. Consolidated operating margin was 16.3%, broadly stable, as retail margin expansion offset weaker refining contribution.',
      },
      {
        heading: 'Risk Factors — Commodity and Refining Exposure',
        page: 71,
        body: 'A material portion of consolidated earnings remains exposed to refining spreads and crude differentials, both of which are outside management control. A sustained narrowing of product cracks would compress segment profitability. The company does not hedge the full exposure. Currency movement on imported crude introduces further variability in landed cost. Investors should regard refining earnings as inherently cyclical.',
      },
      {
        heading: 'Risk Factors — Capital Commitments',
        page: 74,
        body: 'The new-energy build-out carries substantial multi-year capital commitments. Free cash flow generation is expected to remain constrained until these assets commission and ramp. Any delay in commissioning, cost overrun, or slower-than-expected demand for the associated products would extend the payback period. Debt to equity stood at 0.42 times at year end, providing headroom but not immunity to a prolonged capex cycle.',
      },
      {
        heading: 'Capital Allocation and Returns',
        page: 88,
        body: 'Return on equity was 9.1% for the year, below the consolidated cost of capital, reflecting the weight of assets still under construction. Management expects returns to improve as new-energy and retail assets mature. Earnings per share grew 11.2%, ahead of revenue growth, assisted by lower finance costs following refinancing during the year.',
      },
    ],
  },
  {
    documentId: 'ril_q3_result_2025',
    title: 'Reliance Industries — Q3 FY2025 Results Release (synthetic)',
    company: 'Reliance Industries Ltd.',
    ticker: 'RELIANCE',
    documentType: 'quarterly_result',
    source: 'Synthetic quarterly release',
    sourceUrl: 'webquant://corpus/ril_q3_result_2025',
    publishedAt: '2025-11-11',
    synthetic: true,
    sections: [
      {
        heading: 'Quarter Highlights',
        page: 1,
        body: 'Retail segment revenue posted double-digit growth year on year, ahead of the prior quarter, driven by consumer electronics and grocery. Digital services added subscribers with stable average revenue per user. Consolidated profit after tax rose modestly as the retail contribution offset softness elsewhere in the portfolio.',
      },
      {
        heading: 'Outlook and Guidance',
        page: 3,
        body: 'Management trimmed its refining margin guidance for the coming quarter, citing weaker product cracks and elevated regional supply. Retail is expected to sustain double-digit growth. Management declined to guide on new-energy contribution, noting that commissioning timelines remain subject to equipment delivery schedules.',
      },
    ],
  },
  {
    documentId: 'ril_exchange_disclosure_2025',
    title: 'Reliance Industries — Exchange Disclosure, Capital Commitment (synthetic)',
    company: 'Reliance Industries Ltd.',
    ticker: 'RELIANCE',
    documentType: 'regulatory_disclosure',
    source: 'Synthetic exchange filing',
    sourceUrl: 'webquant://corpus/ril_exchange_disclosure_2025',
    publishedAt: '2025-11-04',
    synthetic: true,
    sections: [
      {
        heading: 'Disclosure under Listing Regulations',
        page: 1,
        body: 'The board approved an additional capital commitment towards the new-energy manufacturing complex, to be funded through internal accruals and existing facilities. The commitment extends the previously disclosed capital expenditure programme. The company confirms that the commitment does not alter its stated leverage policy and that no fresh equity issuance is contemplated at this time.',
      },
    ],
  },

  // ── TCS ───────────────────────────────────────────────────────────────────
  {
    documentId: 'tcs_annual_report_2025',
    title: 'Tata Consultancy Services — Annual Report FY2025 (synthetic)',
    company: 'Tata Consultancy Services Ltd.',
    ticker: 'TCS',
    documentType: 'annual_report',
    source: 'Synthetic annual report',
    sourceUrl: 'webquant://corpus/tcs_annual_report_2025',
    publishedAt: '2025-05-22',
    synthetic: true,
    sections: [
      {
        heading: 'Management Discussion — Demand Environment',
        page: 28,
        body: 'Revenue grew 4.1% year on year in constant currency, the slowest pace in four years. Clients continued to prioritise cost-takeout programmes over discretionary transformation spending, particularly in banking, financial services and insurance. Deal total contract value was broadly flat sequentially. Management characterised the demand environment as stable but not improving.',
      },
      {
        heading: 'Risk Factors — Client Concentration and Discretionary Spend',
        page: 63,
        body: 'A significant share of revenue is derived from the banking, financial services and insurance vertical. Continued deferral of discretionary programmes in this vertical would weigh disproportionately on growth. The company has limited ability to offset such deferrals in the short term given the fixed nature of delivery capacity. Pricing pressure in renewals represents an additional risk to realisation.',
      },
      {
        heading: 'Risk Factors — Currency and Wage Inflation',
        page: 66,
        body: 'A majority of revenue is billed in currencies other than the reporting currency, and the company hedges only a portion of this exposure on a rolling basis. Wage inflation in key delivery locations continues to exceed general inflation. Operating margin of 24.1% was sustained through utilisation gains and pyramid rationalisation rather than pricing, and this lever is finite.',
      },
      {
        heading: 'Capital Efficiency',
        page: 81,
        body: 'Return on equity was 46.8%, supported by an asset-light delivery model and debt to equity of 0.09 times. Earnings per share grew 5.6%. The board maintained its policy of returning substantially all free cash flow to shareholders through dividends and buyback.',
      },
    ],
  },
  {
    documentId: 'tcs_q3_result_2025',
    title: 'Tata Consultancy Services — Q3 FY2025 Results Release (synthetic)',
    company: 'Tata Consultancy Services Ltd.',
    ticker: 'TCS',
    documentType: 'quarterly_result',
    source: 'Synthetic quarterly release',
    sourceUrl: 'webquant://corpus/tcs_q3_result_2025',
    publishedAt: '2025-11-10',
    synthetic: true,
    sections: [
      {
        heading: 'Quarter Highlights',
        page: 1,
        body: 'Order book total contract value was broadly flat sequentially. Management reiterated existing demand commentary without revision. Headcount declined marginally as hiring remained calibrated to the current demand environment. Operating margin was held flat quarter on quarter.',
      },
      {
        heading: 'Commentary on Discretionary Spending',
        page: 2,
        body: 'Management noted that discretionary programmes in banking clients remain deferred rather than cancelled, and expects conversion to depend on interest-rate expectations in client geographies. No timeline was offered for recovery. Cost-takeout mandates continue to convert at a healthy rate but carry lower realisation than transformation work.',
      },
    ],
  },

  // ── INFOSYS ───────────────────────────────────────────────────────────────
  {
    documentId: 'infy_annual_report_2025',
    title: 'Infosys — Annual Report FY2025 (synthetic)',
    company: 'Infosys Ltd.',
    ticker: 'INFY',
    documentType: 'annual_report',
    source: 'Synthetic annual report',
    sourceUrl: 'webquant://corpus/infy_annual_report_2025',
    publishedAt: '2025-05-30',
    synthetic: true,
    sections: [
      {
        heading: 'Management Discussion — Growth and Guidance',
        page: 31,
        body: 'Revenue grew 6.9% year on year, ahead of the peer median, with cloud modernisation and data platform work leading the mix. The company raised the lower bound of its full-year revenue growth guidance following a stronger second half. Large-deal wins included a multi-year cloud modernisation mandate with a European client, the value of which has not been disclosed.',
      },
      {
        heading: 'Risk Factors — Attrition and Delivery',
        page: 58,
        body: 'Voluntary attrition rose modestly during the year and remains a margin headwind, as replacement hiring carries both recruitment cost and a productivity lag. Concentration of delivery in a limited number of locations exposes the company to localised wage escalation and infrastructure disruption. Operating margin of 21.0% reflects these pressures.',
      },
      {
        heading: 'Risk Factors — Client and Contract',
        page: 61,
        body: 'Several large contracts contain benefit-sharing and productivity-improvement clauses that reduce billed revenue over the contract life. Failure to offset these through automation would compress realisation. The company also notes that a small number of clients account for a meaningful share of revenue, and the loss of any one would be material to the segment concerned.',
      },
      {
        heading: 'Capital Efficiency',
        page: 76,
        body: 'Return on equity was 31.2% with debt to equity of 0.11 times. Earnings per share grew 9.8%, ahead of revenue growth, reflecting operating leverage and a lower effective tax rate. The company trades at a discount to the sector multiple on a trailing basis.',
      },
    ],
  },
  {
    documentId: 'infy_q3_result_2025',
    title: 'Infosys — Q3 FY2025 Results Release (synthetic)',
    company: 'Infosys Ltd.',
    ticker: 'INFY',
    documentType: 'quarterly_result',
    source: 'Synthetic quarterly release',
    sourceUrl: 'webquant://corpus/infy_q3_result_2025',
    publishedAt: '2025-11-12',
    synthetic: true,
    sections: [
      {
        heading: 'Quarter Highlights and Revised Guidance',
        page: 1,
        body: 'Full-year revenue growth guidance was revised upward at the lower bound following a stronger quarter. Deal pipeline was described as healthy with improved conversion in cloud and data engineering. Operating margin expanded sequentially on utilisation and a favourable currency movement.',
      },
      {
        heading: 'Attrition Commentary',
        page: 2,
        body: 'Voluntary attrition ticked up quarter on quarter. Management attributed the increase to competitive hiring in data and cloud skills and indicated that compensation review timing would affect the coming quarter margin.',
      },
    ],
  },

  // ── HDFC BANK ─────────────────────────────────────────────────────────────
  {
    documentId: 'hdfcbank_annual_report_2025',
    title: 'HDFC Bank — Annual Report FY2025 (synthetic)',
    company: 'HDFC Bank Ltd.',
    ticker: 'HDFCBANK',
    documentType: 'annual_report',
    source: 'Synthetic annual report',
    sourceUrl: 'webquant://corpus/hdfcbank_annual_report_2025',
    publishedAt: '2025-06-05',
    synthetic: true,
    sections: [
      {
        heading: 'Management Discussion — Balance Sheet Growth',
        page: 40,
        body: 'Net interest income grew 12.7% year on year. Deposit accretion outpaced loan growth during the second half, improving the funding profile and easing the loan-to-deposit ratio concern raised in the prior year. Operating margin was 28.6%. Earnings per share grew 14.1%.',
      },
      {
        heading: 'Risk Factors — Margin and Funding Cost',
        page: 69,
        body: 'Net interest margin remains under pressure until the deposit repricing cycle completes. A faster-than-expected rise in funding cost, or competitive pressure on deposit rates, would compress margin further. The bank notes that margin recovery is contingent on the policy rate path, which is outside management control.',
      },
      {
        heading: 'Risk Factors — Credit and Concentration',
        page: 72,
        body: 'Asset quality in the unsecured retail book warrants monitoring given system-level trends in delinquency. Debt to equity of 1.14 times is structural to the banking model but leaves the bank sensitive to the rate cycle. A deterioration in the unsecured book would require elevated provisioning and would affect return on equity, reported at 16.9%.',
      },
    ],
  },
  {
    documentId: 'hdfcbank_regulatory_2025',
    title: 'HDFC Bank — Regulatory Disclosure on Deposit Mobilisation (synthetic)',
    company: 'HDFC Bank Ltd.',
    ticker: 'HDFCBANK',
    documentType: 'regulatory_disclosure',
    source: 'Synthetic regulatory filing',
    sourceUrl: 'webquant://corpus/hdfcbank_regulatory_2025',
    publishedAt: '2025-11-13',
    synthetic: true,
    sections: [
      {
        heading: 'Disclosure of Business Update',
        page: 1,
        body: 'The bank disclosed provisional business figures for the period, showing deposit growth ahead of advances growth. The disclosure notes that the figures are provisional and unaudited and remain subject to review. Management guided that net interest margin compression would persist until the repricing of legacy term deposits completes.',
      },
    ],
  },
];

export const CORPUS_TICKERS = [...new Set(CORPUS.map((d) => d.ticker))];
