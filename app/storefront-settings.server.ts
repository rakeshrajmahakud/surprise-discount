import type { Offer } from "@prisma/client";
import { discountCodeFor, idsFromStorage } from "./offers.server";

export const defaultBlockSettings = {
  offerReady: false,
  selectedOfferId: "",
  message: "A little surprise is waiting for you",
  buttonLabel: "Reveal my discount",
  discountMode: "coupon",
  discountType: "percentage",
  discountValue: "15",
  couponCode: "",
  backgroundColor: "#fff4d6",
  textColor: "#1f2933",
  buttonColor: "#e85d04",
  buttonTextColor: "#ffffff",
  buttonRadius: 8,
  appliesTo: "all",
  productIds: [] as string[],
  collectionIds: [] as string[],
};

export type BlockSettings = typeof defaultBlockSettings;

type Admin = { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> };

export const liquidIds = (ids: string[]) => ids.map((id) => id.split("/").pop() ?? id);

async function shopId(admin: Admin) {
  const response = await admin.graphql("{ shop { id } }");
  const payload = await response.json() as { data?: { shop?: { id?: string } } };
  if (!payload.data?.shop?.id) throw new Error("Shopify shop ID was not returned");
  return payload.data.shop.id;
}

export async function readBlockSettings(admin: Admin) {
  const response = await admin.graphql("{ shop { metafield(namespace: \"$app\", key: \"surprise_discount_settings\") { jsonValue } } }");
  const payload = await response.json() as { data?: { shop?: { metafield?: { jsonValue?: unknown } | null } } };
  const savedSettings = payload.data?.shop?.metafield?.jsonValue;
  return savedSettings && typeof savedSettings === "object" && !Array.isArray(savedSettings)
    ? { ...defaultBlockSettings, ...(savedSettings as Partial<BlockSettings>) }
    : defaultBlockSettings;
}

export async function saveBlockSettings(admin: Admin, settings: BlockSettings) {
  const ownerId = await shopId(admin);
  const response = await admin.graphql(`#graphql
    mutation SaveStorefrontSettings($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { message } }
    }`, { variables: { metafields: [{ ownerId, namespace: "$app", key: "surprise_discount_settings", type: "json", value: JSON.stringify(settings) }] } });
  const payload = await response.json() as { data?: { metafieldsSet?: { userErrors?: Array<{ message: string }> } }; errors?: Array<{ message: string }> };
  const error = payload.errors?.[0]?.message ?? payload.data?.metafieldsSet?.userErrors?.[0]?.message;
  if (error) throw new Error(error);
}

export async function syncOfferToBlock(admin: Admin, settings: BlockSettings, offer: Offer | null) {
  if (!offer) {
    await saveBlockSettings(admin, { ...settings, offerReady: false, selectedOfferId: "" });
    return;
  }
  await saveBlockSettings(admin, {
    ...settings,
    selectedOfferId: offer.id,
    discountMode: offer.discountMethod,
    discountType: offer.discountType,
    discountValue: String(offer.discountValue),
    couponCode: offer.discountMethod === "coupon" ? discountCodeFor(offer.name) : "",
    appliesTo: offer.appliesTo,
    productIds: liquidIds(idsFromStorage(offer.productIds)),
    collectionIds: liquidIds(idsFromStorage(offer.collectionIds)),
    offerReady: true,
  });
}