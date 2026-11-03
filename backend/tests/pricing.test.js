import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPricedLines, calculateTotals } from '../src/services/pricing-core.js';

const product = (overrides = {}) => ({
  id: 'incense-1', name: 'Royal Sandal', active: true, archivedAt: null,
  sellingPricePaise: 9600, stockQuantity: 40, minimumOrderQuantity: 3,
  shippingEligible: true, ...overrides,
});
const price = (quantity, productOverride = {}, settingsOverride = {}, offers = []) => {
  const item = product(productOverride);
  const lines = buildPricedLines([item], [{ productId: item.id, quantity }], 3);
  return calculateTotals(lines, { freeShippingThreshold: 6, shippingChargePaise: 4900, mixedCartShippingPolicy: 'eligible_items', ...settingsOverride }, offers, new Date('2026-01-01T00:00:00Z'));
};

test('enforces the three-piece minimum and accepts three pieces', () => {
  assert.throws(() => price(2), (error) => error.status === 400 && /minimum order of 3/.test(error.message));
  assert.equal(price(3).subtotalPaise, 28800);
  assert.throws(() => price(3, { minimumOrderQuantity: 4 }), (error) => error.status === 400 && /minimum order of 4/.test(error.message));
});

test('uses the current server price rather than a cart-supplied price', () => {
  const item = product({ sellingPricePaise: 12345 });
  const [line] = buildPricedLines([item], [{ productId: item.id, quantity: 3, sellingPricePaise: 1 }]);
  assert.equal(line.lineTotalPaise, 37035);
});

test('rejects inactive, out-of-stock, and unpriced items', () => {
  assert.throws(() => price(3, { active: false }), (error) => error.status === 409);
  assert.throws(() => price(41), (error) => error.status === 409 && /enough available stock/.test(error.message));
  assert.throws(() => price(3, { sellingPricePaise: null }), (error) => error.status === 409 && /not configured/.test(error.message));
});

test('charges configured shipping for five eligible units and makes six free', () => {
  const five = price(5);
  assert.equal(five.shippingPaise, 4900);
  assert.equal(five.totalPaise, 52900);
  const six = price(6);
  assert.equal(six.shippingPaise, 0);
  assert.equal(six.totalPaise, 57600);
});

test('free shipping threshold scales to quantities above six', () => {
  const twelve = price(12);
  assert.equal(twelve.shippingPaise, 0);
  assert.equal(twelve.totalPaise, 115200);
});

test('supports the all-items and eligible-items mixed-cart policies', () => {
  const eligible = product({ id: 'eligible', sellingPricePaise: 1000 });
  const excluded = product({ id: 'excluded', sellingPricePaise: 2000, shippingEligible: false });
  const lines = buildPricedLines([eligible, excluded], [{ productId: eligible.id, quantity: 6 }, { productId: excluded.id, quantity: 3 }]);
  assert.equal(calculateTotals(lines, { freeShippingThreshold: 6, shippingChargePaise: 4900, mixedCartShippingPolicy: 'eligible_items' }).shippingPaise, 0);
  assert.equal(calculateTotals(lines, { freeShippingThreshold: 6, shippingChargePaise: 4900, mixedCartShippingPolicy: 'all_items' }).shippingPaise, 4900);
});

test('applies the best eligible discount and honors offer dates', () => {
  const offers = [
    { active: true, discountType: 'PERCENT', discountValue: 10 },
    { active: true, discountType: 'FIXED', discountValue: 5000 },
    { active: true, discountType: 'FIXED', discountValue: 20000, startsAt: new Date('2027-01-01') },
    { active: true, discountType: 'FIXED', discountValue: 25000, endsAt: new Date('2025-12-31') },
  ];
  const result = price(3, {}, {}, offers);
  assert.equal(result.discountPaise, 5000);
  assert.equal(result.totalPaise, 28700);
});

test('rejects duplicate products and missing shipping configuration', () => {
  assert.throws(() => buildPricedLines([product()], [{ productId: 'incense-1', quantity: 3 }, { productId: 'incense-1', quantity: 3 }]), (error) => error.status === 400);
  assert.throws(() => price(3, {}, { shippingChargePaise: null }), (error) => error.status === 503);
});
