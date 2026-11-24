/**
 * Income-tax slab data. Edit this file when the Finance Act changes.
 * Verify every value against the Income Tax Department before publishing.
 */
export interface Slab { upTo: number; rate: number }
export interface Regime { slabs: Slab[]; stdDeduction: number; rebateLimit: number; rebateMax: number }
export interface TaxYear { fy: string; new: Regime; old: Regime }

export const TAX_YEARS: TaxYear[] = [
  // Verified against the Income Tax Department's Tax Year 2026-27 rates and Budget 2026 FAQs.
  {
    fy: 'Tax Year 2026-27',
    new: {
      slabs: [{ upTo: 400000, rate: 0 }, { upTo: 800000, rate: 5 }, { upTo: 1200000, rate: 10 }, { upTo: 1600000, rate: 15 }, { upTo: 2000000, rate: 20 }, { upTo: 2400000, rate: 25 }, { upTo: Infinity, rate: 30 }],
      stdDeduction: 75000, rebateLimit: 1200000, rebateMax: 60000,
    },
    old: {
      slabs: [{ upTo: 250000, rate: 0 }, { upTo: 500000, rate: 5 }, { upTo: 1000000, rate: 20 }, { upTo: Infinity, rate: 30 }],
      stdDeduction: 50000, rebateLimit: 500000, rebateMax: 12500,
    },
  },
  {
    fy: 'FY 2025-26',
    new: {
      slabs: [{ upTo: 400000, rate: 0 }, { upTo: 800000, rate: 5 }, { upTo: 1200000, rate: 10 }, { upTo: 1600000, rate: 15 }, { upTo: 2000000, rate: 20 }, { upTo: 2400000, rate: 25 }, { upTo: Infinity, rate: 30 }],
      stdDeduction: 75000, rebateLimit: 1200000, rebateMax: 60000,
    },
    old: {
      slabs: [{ upTo: 250000, rate: 0 }, { upTo: 500000, rate: 5 }, { upTo: 1000000, rate: 20 }, { upTo: Infinity, rate: 30 }],
      stdDeduction: 50000, rebateLimit: 500000, rebateMax: 12500,
    },
  },
];

export function computeTax(year: TaxYear, regime: 'new' | 'old', income: number, deductions: number) {
  const r = year[regime];
  const taxable = Math.max(0, income - r.stdDeduction - (regime === 'old' ? deductions : 0));
  let grossTax = 0;
  let prev = 0;
  for (const s of r.slabs) {
    if (taxable > prev) grossTax += (Math.min(taxable, s.upTo) - prev) * (s.rate / 100);
    prev = s.upTo;
  }

  // Section 87A rebate. New-regime marginal relief caps tax at the income
  // exceeding ₹12 lakh; old-regime rebate is capped at ₹12,500 up to ₹5 lakh.
  let tax = grossTax;
  let rebate = 0;
  if (regime === 'new') {
    const excess = Math.max(0, taxable - r.rebateLimit);
    tax = taxable <= r.rebateLimit ? 0 : Math.min(grossTax, excess);
    rebate = Math.max(0, grossTax - tax);
  } else if (taxable <= r.rebateLimit) {
    rebate = Math.min(grossTax, r.rebateMax);
    tax = Math.max(0, grossTax - rebate);
  }

  const cess = tax * 0.04;
  return { taxable, grossTax, rebate, tax, cess, total: tax + cess };
}
