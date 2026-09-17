import { CartInput, CartLinesDiscountsGenerateRunResult, DiscountClass, OrderDiscountSelectionStrategy } from '../generated/api';

type OfferConfiguration = { offerId: string; discountType: 'percentage' | 'fixed'; discountValue: number; appliesTo: 'all' | 'products'; productIds: string[] };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function config(value: unknown): OfferConfiguration | null {
  const valueRecord = record(value);
  if (!valueRecord || typeof valueRecord.offerId !== 'string' || typeof valueRecord.discountValue !== 'number' || !Number.isFinite(valueRecord.discountValue)) return null;
  if ((valueRecord.discountType !== 'percentage' && valueRecord.discountType !== 'fixed') || (valueRecord.appliesTo !== 'all' && valueRecord.appliesTo !== 'products')) return null;
  return { offerId: valueRecord.offerId, discountType: valueRecord.discountType, discountValue: valueRecord.discountValue, appliesTo: valueRecord.appliesTo, productIds: Array.isArray(valueRecord.productIds) ? valueRecord.productIds.filter((id): id is string => typeof id === 'string') : [] };
}

export function cartLinesDiscountsGenerateRun(input: CartInput): CartLinesDiscountsGenerateRunResult {
  const offer = config(input.discount.metafield?.jsonValue);
  if (!offer || !input.cart.lines.length || !input.discount.discountClasses.includes(DiscountClass.Order)) return { operations: [] };

  const excludedCartLineIds = input.cart.lines.filter((line) => {
    if (offer.appliesTo === 'all') return false;
    const product = line.merchandise.__typename === 'ProductVariant' ? line.merchandise.product : undefined;
    return !product || !offer.productIds.includes(product.id);
  }).map((line) => line.id);
  if (excludedCartLineIds.length === input.cart.lines.length) return { operations: [] };

  return { operations: [{ orderDiscountsAdd: {
    candidates: [{
      message: `Surprise discount: ${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' off'}`,
      targets: [{ orderSubtotal: { excludedCartLineIds } }],
      value: offer.discountType === 'percentage' ? { percentage: { value: offer.discountValue.toString() } } : { fixedAmount: { amount: offer.discountValue.toString() } },
    }],
    selectionStrategy: OrderDiscountSelectionStrategy.First,
  } }] };
}
