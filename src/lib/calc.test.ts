import test from 'node:test';
import assert from 'node:assert/strict';
import { CALCS, emi, findCalc } from './calc';
import { TAX_YEARS, computeTax } from './taxConfig';

test('emi() computes accurate reducing-balance EMI and handles 0% / invalid edge cases', () => {
  const monthly = emi(500000, 10, 5);
  assert.equal(Math.round(monthly), 10624);

  assert.equal(emi(120000, 0, 1), 10000);
  assert.equal(emi(500000, 10, 0), 0);
  assert.equal(emi(-10000, 10, 5), 0);
  assert.equal(emi(Number.NaN, 10, 5), 0);
});

test('all 12 financial calculators compute valid formatted outputs with default inputs', () => {
  assert.equal(CALCS.length, 12);
  for (const calc of CALCS) {
    if (calc.special === 'tax') continue;
    assert.ok(calc.compute, `Expected compute function for ${calc.slug}`);
    const defaults = Object.fromEntries(calc.fields.map((fd) => [fd.key, fd.def]));
    const res = calc.compute(defaults);
    assert.ok(res.label.length > 0);
    assert.ok(!res.value.includes('NaN') && !res.value.includes('Infinity'), `${calc.slug} returned invalid value: ${res.value}`);
    assert.ok(res.rows.length > 0);
    for (const [, val] of res.rows) {
      assert.ok(!val.includes('NaN') && !val.includes('Infinity'), `${calc.slug} row returned invalid value: ${val}`);
    }
  }
});

test('savings-goal and retirement calculators handle zero-rate and equal-inflation edge cases safely', () => {
  const goal = findCalc('savings-goal-calculator')!;
  const zeroRate = goal.compute!({ goal: 120000, rate: 0, years: 1 });
  assert.equal(zeroRate.value, '₹ 10,000');

  const zeroYears = goal.compute!({ goal: 120000, rate: 7, years: 0 });
  assert.equal(zeroYears.value, '₹ 0');

  const ret = findCalc('retirement-calculator')!;
  const equalReal = ret.compute!({ age: 30, retire: 60, expense: 50000, inflation: 6, post: 6, span: 20 });
  assert.ok(!equalReal.value.includes('NaN') && !equalReal.value.includes('Infinity'));

  const alreadyRetired = ret.compute!({ age: 65, retire: 60, expense: 50000, inflation: 6, post: 8, span: 20 });
  assert.equal(alreadyRetired.rows[0][1], '0');
});

test('computeTax FY 2025-26 applies new regime std deduction, slabs, Section 87A rebate, and 4% cess', () => {
  const fy = TAX_YEARS[0];
  assert.equal(fy.fy, 'FY 2025-26');

  // Salaried ₹12,75,000 gross -> ₹12,00,000 taxable -> full 87A rebate -> ₹0 total tax
  const rebateEdge = computeTax(fy, 'new', 1275000, 150000);
  assert.equal(rebateEdge.taxable, 1200000);
  assert.equal(rebateEdge.tax, 0);
  assert.equal(rebateEdge.total, 0);

  // Salaried ₹16,75,000 gross -> ₹16,00,000 taxable (above rebate threshold)
  // 0-4L: 0, 4-8L: 20k, 8-12L: 40k, 12-16L: 60k => tax 1,20,000 + 4% cess 4,800 = 1,24,800
  const higherNew = computeTax(fy, 'new', 1675000, 150000);
  assert.equal(higherNew.taxable, 1600000);
  assert.equal(higherNew.tax, 120000);
  assert.equal(higherNew.cess, 4800);
  assert.equal(higherNew.total, 124800);

  // Old regime: ₹12,00,000 gross - ₹50,000 std - ₹1,50,000 deductions = ₹10,00,000 taxable
  // 0-2.5L: 0, 2.5-5L: 12.5k, 5-10L: 1L => tax 1,12,500 + 4% cess 4,500 = 1,17,000
  const oldRegime = computeTax(fy, 'old', 1200000, 150000);
  assert.equal(oldRegime.taxable, 1000000);
  assert.equal(oldRegime.tax, 112500);
  assert.equal(oldRegime.cess, 4500);
  assert.equal(oldRegime.total, 117000);

  // Negative / NaN inputs never yield NaN
  const invalid = computeTax(fy, 'new', Number.NaN, -5000);
  assert.equal(invalid.taxable, 0);
  assert.equal(invalid.total, 0);
});
