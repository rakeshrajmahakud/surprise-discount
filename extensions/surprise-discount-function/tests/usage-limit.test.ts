import { describe, expect, test } from 'vitest';
import { DiscountClass, type CartInput } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from '../src/cart_lines_discounts_generate_run';

const input = (): CartInput => ({
  cart: {
    lines: [{ id: 'gid://shopify/CartLine/1', merchandise: { __typename: 'ProductVariant', product: { id: 'gid://shopify/Product/1' } } }],
  },
  discount: {
    discountClasses: [DiscountClass.Order],
    metafield: { jsonValue: { offerId: 'offer_1', discountType: 'percentage', discountValue: 15, appliesTo: 'all', productIds: [] } },
  },
} as CartInput);

describe('Surprise Discount usage limit', () => {
  test('returns a candidate when the offer is configured', () => {
    expect(cartLinesDiscountsGenerateRun(input()).operations).toHaveLength(1);
  });
});
