import type { Offer } from "@prisma/client";
import db from "./db.server";

export type OfferInput = {
  name: string;
  discountType: "percentage" | "fixed";
  discountMethod: "automatic" | "coupon";
  discountValue: number;
  appliesTo: "all" | "collections" | "products";
  productIds: string[];
  collectionIds: string[];
  startDate: Date;
  endDate: Date;
  totalUsageLimit?: number | null;
  combinesWithOther: boolean;
  status: "active" | "scheduled" | "expired" | "disabled";
};

export const offerStatus = (
  offer: { status: string; startDate: Date; endDate: Date },
  now = new Date(),
) => offer.status === "disabled" ? "disabled" : offer.endDate < now ? "expired" : offer.startDate > now ? "scheduled" : "active";

export function idsFromStorage(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : [];
  } catch {
    return [];
  }
}

export function discountCodeFor(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 60);
}

export async function canUseOffer(offerId: string, shop: string) {
  const offer = await db.offer.findFirst({ where: { id: offerId, shop } });
  if (!offer) return { allowed: false, reason: "Offer not found" };

  const now = new Date();
  if (offer.status !== "active" || now < offer.startDate || now > offer.endDate) {
    return { allowed: false, reason: "Offer is not currently active" };
  }

  const totalUses = await db.redemption.count({ where: { offerId } });
  if (offer.totalUsageLimit !== null && totalUses >= offer.totalUsageLimit) {
    return { allowed: false, reason: "Offer usage limit reached", totalUses };
  }
  return { allowed: true, totalUses, offer };
}

type AdminClient = { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> };

export async function createShopifyDiscount(admin: AdminClient, offer: Offer) {
  const ids = offer.appliesTo === "products" ? idsFromStorage(offer.productIds) : idsFromStorage(offer.collectionIds);
  const items = offer.appliesTo === "all"
    ? { all: true }
    : offer.appliesTo === "products"
      ? { products: { productsToAdd: ids } }
      : { collections: { collectionsToAdd: ids } };
  const value = offer.discountType === "percentage"
    ? { percentage: offer.discountValue / 100 }
    : { discountAmount: { amount: offer.discountValue, appliesOnEachItem: false } };
  if (offer.discountMethod === "automatic") {
    const mutation = `#graphql
      mutation CreateAutomaticDiscount($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
        discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
          automaticDiscountNode { id }
          userErrors { field message code }
        }
      }`;
    const response = await admin.graphql(mutation, { variables: {
      automaticBasicDiscount: {
        title: offer.name,
        startsAt: offer.startDate.toISOString(),
        endsAt: offer.endDate.toISOString(),
        customerGets: { items, value },
        combinesWith: { orderDiscounts: offer.combinesWithOther, productDiscounts: offer.combinesWithOther, shippingDiscounts: offer.combinesWithOther },
      },
    } });
    const payload = await response.json() as { data?: { discountAutomaticBasicCreate?: { automaticDiscountNode?: { id: string }; userErrors?: Array<{ message: string }> } }; errors?: Array<{ message: string }> };
    const result = payload.data?.discountAutomaticBasicCreate;
    const error = payload.errors?.[0]?.message ?? result?.userErrors?.[0]?.message;
    if (error || !result?.automaticDiscountNode) throw new Error(error ?? "Shopify did not create the automatic discount");
    return { id: result.automaticDiscountNode.id };
  }
  // A collection target stays on Shopify's native discount API because Function input queries
  // cannot dynamically turn a config JSON collection list into GraphQL arguments.
  if (process.env.SHOPIFY_DISCOUNT_FUNCTION_ID && offer.appliesTo !== "collections") {
    const mutation = `#graphql
      mutation CreateFunctionDiscount($codeAppDiscount: DiscountCodeAppInput!) {
        discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
          codeAppDiscount { discountId }
          userErrors { field message code }
        }
      }`;
    const response = await admin.graphql(mutation, { variables: {
      codeAppDiscount: {
        title: offer.name,
        code: discountCodeFor(offer.name),
        functionId: process.env.SHOPIFY_DISCOUNT_FUNCTION_ID,
        startsAt: offer.startDate.toISOString(),
        endsAt: offer.endDate.toISOString(),
        usageLimit: offer.totalUsageLimit ?? undefined,
        combinesWith: { orderDiscounts: offer.combinesWithOther, productDiscounts: offer.combinesWithOther, shippingDiscounts: offer.combinesWithOther },
        metafields: [{ namespace: "$app", key: "function-configuration", type: "json", value: JSON.stringify({ offerId: offer.id, discountType: offer.discountType, discountValue: offer.discountValue, appliesTo: offer.appliesTo, productIds: ids }) }],
      },
    } });
    const payload = await response.json() as { data?: { discountCodeAppCreate?: { codeAppDiscount?: { discountId: string }; userErrors?: Array<{ message: string }> } }; errors?: Array<{ message: string }> };
    const result = payload.data?.discountCodeAppCreate;
    const error = payload.errors?.[0]?.message ?? result?.userErrors?.[0]?.message;
    if (error || !result?.codeAppDiscount) throw new Error(error ?? "Shopify did not create the function discount");
    return { id: result.codeAppDiscount.discountId };
  }

  const mutation = `#graphql
    mutation CreateDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode { id codeDiscount { ... on DiscountCodeBasic { title codes(first: 1) { nodes { code } } } } }
        userErrors { field message code }
      }
    }`;
  const response = await admin.graphql(mutation, {
    variables: {
      basicCodeDiscount: {
        title: offer.name,
        code: discountCodeFor(offer.name),
        startsAt: offer.startDate.toISOString(),
        endsAt: offer.endDate.toISOString(),
        usageLimit: offer.totalUsageLimit ?? undefined,
        customerSelection: { all: true },
        customerGets: { items, value },
        combinesWith: { orderDiscounts: offer.combinesWithOther, productDiscounts: offer.combinesWithOther, shippingDiscounts: offer.combinesWithOther },
      },
    },
  });
  const payload = await response.json() as { data?: { discountCodeBasicCreate?: { codeDiscountNode?: { id: string }; userErrors?: Array<{ message: string }> } }; errors?: Array<{ message: string }> };
  const result = payload.data?.discountCodeBasicCreate;
  const error = payload.errors?.[0]?.message ?? result?.userErrors?.[0]?.message;
  if (error || !result?.codeDiscountNode) throw new Error(error ?? "Shopify did not create the discount");
  return { id: result.codeDiscountNode.id, code: discountCodeFor(offer.name) };
}

function discountInput(offer: Offer) {
  const ids = offer.appliesTo === "products" ? idsFromStorage(offer.productIds) : idsFromStorage(offer.collectionIds);
  const items = offer.appliesTo === "all"
    ? { all: true }
    : offer.appliesTo === "products"
      ? { products: { productsToAdd: ids } }
      : { collections: { collectionsToAdd: ids } };
  const value = offer.discountType === "percentage"
    ? { percentage: offer.discountValue / 100 }
    : { discountAmount: { amount: offer.discountValue, appliesOnEachItem: false } };
  return {
    title: offer.name,
    startsAt: offer.startDate.toISOString(),
    endsAt: offer.endDate.toISOString(),
    customerGets: { items, value },
    combinesWith: { orderDiscounts: offer.combinesWithOther, productDiscounts: offer.combinesWithOther, shippingDiscounts: offer.combinesWithOther },
  };
}

export async function updateShopifyDiscount(admin: AdminClient, offer: Offer) {
  const input = discountInput(offer);
  let mutation: string;
  let variables: Record<string, unknown>;

  if (offer.discountMethod === "automatic") {
    mutation = `#graphql
      mutation UpdateAutomaticDiscount($id: ID!, $automaticBasicDiscount: DiscountAutomaticBasicInput!) {
        discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $automaticBasicDiscount) { userErrors { message } }
      }`;
    variables = { id: offer.shopifyPriceRuleId, automaticBasicDiscount: input };
  } else if (process.env.SHOPIFY_DISCOUNT_FUNCTION_ID && offer.appliesTo !== "collections") {
    mutation = `#graphql
      mutation UpdateFunctionDiscount($id: ID!, $codeAppDiscount: DiscountCodeAppInput!) {
        discountCodeAppUpdate(id: $id, codeAppDiscount: $codeAppDiscount) { userErrors { message } }
      }`;
    variables = { id: offer.shopifyDiscountCodeId, codeAppDiscount: { ...input, functionId: process.env.SHOPIFY_DISCOUNT_FUNCTION_ID, code: discountCodeFor(offer.name), metafields: [{ namespace: "$app", key: "function-configuration", type: "json", value: JSON.stringify({ offerId: offer.id, discountType: offer.discountType, discountValue: offer.discountValue, appliesTo: offer.appliesTo, productIds: idsFromStorage(offer.productIds) }) }] } };
  } else {
    mutation = `#graphql
      mutation UpdateCodeDiscount($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) { userErrors { message } }
      }`;
    variables = { id: offer.shopifyDiscountCodeId, basicCodeDiscount: { ...input, code: discountCodeFor(offer.name), usageLimit: offer.totalUsageLimit ?? undefined, customerSelection: { all: true } } };
  }

  const response = await admin.graphql(mutation, { variables });
  const payload = await response.json() as { data?: Record<string, { userErrors?: Array<{ message: string }> }>; errors?: Array<{ message: string }> };
  const error = payload.errors?.[0]?.message ?? Object.values(payload.data ?? {})[0]?.userErrors?.[0]?.message;
  if (error) throw new Error(error);
}

export async function deleteShopifyDiscount(admin: AdminClient, offer: Offer) {
  const mutation = offer.discountMethod === "automatic"
    ? `#graphql
      mutation DeleteAutomaticDiscount($id: ID!) {
        discountAutomaticDelete(id: $id) { userErrors { message } }
      }`
    : process.env.SHOPIFY_DISCOUNT_FUNCTION_ID && offer.appliesTo !== "collections"
      ? `#graphql
        mutation DeleteFunctionDiscount($id: ID!) {
          discountCodeAppDelete(id: $id) { userErrors { message } }
        }`
      : `#graphql
        mutation DeleteCodeDiscount($id: ID!) {
          discountCodeDelete(id: $id) { userErrors { message } }
        }`;
  const id = offer.discountMethod === "automatic" ? offer.shopifyPriceRuleId : offer.shopifyDiscountCodeId;
  if (!id) return;
  const response = await admin.graphql(mutation, { variables: { id } });
  const payload = await response.json() as { data?: Record<string, { userErrors?: Array<{ message: string }> }>; errors?: Array<{ message: string }> };
  const error = payload.errors?.[0]?.message ?? Object.values(payload.data ?? {})[0]?.userErrors?.[0]?.message;
  if (error) throw new Error(error);
}
