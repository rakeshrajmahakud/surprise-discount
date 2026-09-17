import { useEffect, useMemo, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { analyticsOverview } from "../analytics.server";
import {
  createShopifyDiscount,
  deleteShopifyDiscount,
  discountCodeFor,
  offerStatus,
  updateShopifyDiscount,
  type OfferInput,
} from "../offers.server";
import { authenticate } from "../shopify.server";
import {
  readBlockSettings,
  syncOfferToBlock,
} from "../storefront-settings.server";

const dateInput = (date: Date) => date.toISOString().slice(0, 16);
const asArray = (value: FormDataEntryValue | null) => {
  try {
    const ids: unknown = JSON.parse(String(value ?? "[]"));
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};
const statusRank: Record<string, number> = {
  active: 0,
  scheduled: 1,
  expired: 2,
  disabled: 3,
};
const displayStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

async function syncLatestOffer(admin: Parameters<typeof syncOfferToBlock>[0], shop: string) {
  const settings = await readBlockSettings(admin);
  const selectedOffer = settings.selectedOfferId
    ? await db.offer.findFirst({ where: { id: settings.selectedOfferId, shop } })
    : null;
  const fallbackOffer = selectedOffer ?? await db.offer.findFirst({ where: { shop }, orderBy: { createdAt: "desc" } });
  await syncOfferToBlock(admin, settings, fallbackOffer);
}

const asArrayFromStorage = (value: string) => {
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const [savedOffers, analytics] = await Promise.all([
    db.offer.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
    }),
    analyticsOverview(session.shop),
  ]);
  const offers = savedOffers
    .map((offer) => ({ ...offer, status: offerStatus(offer) }))
    .sort(
      (left, right) =>
        statusRank[left.status] - statusRank[right.status] ||
        right.createdAt.getTime() - left.createdAt.getTime(),
    );
  return {
    offers,
    analytics,
    now: dateInput(new Date()),
    defaultEnd: dateInput(new Date(Date.now() + 7 * 86400000)),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "deleteOffer") {
    const offer = await db.offer.findFirst({
      where: { id: String(form.get("offerId") ?? ""), shop: session.shop },
    });
    if (!offer) return { error: "Offer not found." };
    try {
      await deleteShopifyDiscount(admin, offer);
      await db.offer.delete({ where: { id: offer.id } });
      await syncLatestOffer(admin, session.shop);
      return { success: `Deleted ${offer.name}.` };
    } catch (error) {
      return {
        error: `Could not delete ${offer.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  if (intent === "editOffer") {
    const offer = await db.offer.findFirst({
      where: { id: String(form.get("offerId") ?? ""), shop: session.shop },
    });
    const name = String(form.get("editName") ?? "").trim();
    const discountValue = Number(form.get("editDiscountValue"));
    const discountType =
      form.get("editDiscountType") === "fixed" ? "fixed" : "percentage";
    const discountMethod =
      form.get("editDiscountMethod") === "automatic" ? "automatic" : "coupon";
    const appliesTo =
      form.get("editAppliesTo") === "collections"
        ? "collections"
        : form.get("editAppliesTo") === "products"
          ? "products"
          : "all";
    const productIds = asArray(form.get("editProductIds"));
    const collectionIds = asArray(form.get("editCollectionIds"));
    const startDate = new Date(String(form.get("editStartDate") ?? ""));
    const endDate = new Date(String(form.get("editEndDate") ?? ""));
    if (
      !offer ||
      !name ||
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      Number.isNaN(startDate.valueOf()) ||
      Number.isNaN(endDate.valueOf()) ||
      endDate <= startDate
    ) {
      return {
        error:
          "Enter a name, a positive discount, and an end date after the start date.",
      };
    }
    const updatedOffer = {
      ...offer,
      name,
      discountType,
      discountMethod,
      discountValue,
      appliesTo,
      productIds: JSON.stringify(productIds),
      collectionIds: JSON.stringify(collectionIds),
      combinesWithOther: form.get("editCombinesWithOther") === "on",
      startDate,
      endDate,
      status: offerStatus({ ...offer, startDate, endDate }),
    };
    try {
      if (offer.discountMethod !== discountMethod) {
        await deleteShopifyDiscount(admin, offer);
        const shopifyDiscount = await createShopifyDiscount(
          admin,
          updatedOffer,
        );
        updatedOffer.shopifyPriceRuleId = shopifyDiscount.id;
        updatedOffer.shopifyDiscountCodeId = shopifyDiscount.id;
      } else {
        await updateShopifyDiscount(admin, updatedOffer);
      }
      await db.offer.update({
        where: { id: offer.id },
        data: {
          name,
          discountType,
          discountMethod,
          discountValue,
          appliesTo,
          productIds: JSON.stringify(productIds),
          collectionIds: JSON.stringify(collectionIds),
          combinesWithOther: updatedOffer.combinesWithOther,
          startDate,
          endDate,
          status: updatedOffer.status,
          shopifyPriceRuleId: updatedOffer.shopifyPriceRuleId,
          shopifyDiscountCodeId: updatedOffer.shopifyDiscountCodeId,
        },
      });
      await syncLatestOffer(admin, session.shop);
      return { success: `Updated ${name}.` };
    } catch (error) {
      return {
        error: `Could not update ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  const name = String(form.get("name") ?? "").trim();
  const discountValue = Number(form.get("discountValue"));
  const startDate = new Date(String(form.get("startDate") ?? ""));
  const endDate = new Date(String(form.get("endDate") ?? ""));
  if (
    !name ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0 ||
    Number.isNaN(startDate.valueOf()) ||
    Number.isNaN(endDate.valueOf()) ||
    endDate <= startDate
  ) {
    return {
      error:
        "Enter a name, a positive discount, and an end date after the start date.",
    };
  }
  const input: OfferInput = {
    name,
    discountType: form.get("discountType") === "fixed" ? "fixed" : "percentage",
    discountMethod:
      form.get("discountMethod") === "automatic" ? "automatic" : "coupon",
    discountValue,
    appliesTo:
      form.get("appliesTo") === "collections"
        ? "collections"
        : form.get("appliesTo") === "products"
          ? "products"
          : "all",
    productIds: asArray(form.get("productIds")),
    collectionIds: asArray(form.get("collectionIds")),
    startDate,
    endDate,
    totalUsageLimit: null,
    combinesWithOther: form.get("combinesWithOther") === "on",
    status: startDate > new Date() ? "scheduled" : "active",
  };
  let offer = await db.offer.create({
    data: {
      shop: session.shop,
      ...input,
      productIds: JSON.stringify(input.productIds),
      collectionIds: JSON.stringify(input.collectionIds),
    },
  });
  try {
    const shopifyDiscount = await createShopifyDiscount(admin, offer);
    offer = await db.offer.update({
      where: { id: offer.id },
      data: {
        shopifyPriceRuleId: shopifyDiscount.id,
        shopifyDiscountCodeId: shopifyDiscount.id,
      },
    });
    const settings = await readBlockSettings(admin);
    await syncOfferToBlock(admin, settings, offer);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Offer saved, but Shopify discount creation failed: ${error.message}`
          : "Offer saved, but Shopify discount creation failed.",
    };
  }
  const code =
    input.discountMethod === "coupon"
      ? ` Coupon code: ${discountCodeFor(offer.name)}.`
      : "";
  return { success: `Created ${offer.name}.${code}` };
}

export default function OffersIndex() {
  const { offers, analytics, now, defaultEnd } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge() as unknown as {
    resourcePicker: (options: {
      type: "product" | "collection";
      multiple: boolean;
    }) => Promise<Array<{ id: string; title: string }> | undefined>;
    toast: {
      show: (message: string, options?: { isError?: boolean; duration?: number }) => string;
    };
  };
  const [tab, setTab] = useState<"offers" | "analytics">("offers");
  const [appliesTo, setAppliesTo] = useState("all");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editAppliesTo, setEditAppliesTo] = useState("all");
  const [editDiscountType, setEditDiscountType] = useState("percentage");
  const [editDiscountMethod, setEditDiscountMethod] = useState("coupon");
  const [editProductIds, setEditProductIds] = useState<string[]>([]);
  const [editCollectionIds, setEditCollectionIds] = useState<string[]>([]);
  const submitting = navigation.state === "submitting";
  const submittingIntent = navigation.formData?.get("intent")?.toString() ?? "createOffer";
  const isCreating = submitting && submittingIntent === "createOffer";
  const isEditing = submitting && submittingIntent === "editOffer";
  const isDeleting = submitting && submittingIntent === "deleteOffer";
  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(value);
  const selectedIds = appliesTo === "products" ? productIds : collectionIds;
  const editingOffer = offers.find((offer) => offer.id === editingOfferId);
  const chartData = useMemo(
    () =>
      analytics.dailyRedemptions.map((row) => ({
        ...row,
        date: row.date.slice(5),
      })),
    [analytics],
  );
  useEffect(() => {
    if (result?.success) shopify.toast.show(result.success, { isError: false, duration: 4000 });
    if (result?.error) shopify.toast.show(result.error, { isError: true, duration: 6000 });
  }, [result, shopify]);
  const chooseResources = async () => {
    const resources = await shopify.resourcePicker({
      type: appliesTo === "products" ? "product" : "collection",
      multiple: true,
    });
    if (!resources) return;
    const ids = resources.map((resource) => resource.id);
    if (appliesTo === "products") setProductIds(ids);
    else setCollectionIds(ids);
  };
  const openEditOffer = (offer: (typeof offers)[number]) => {
    setEditingOfferId(offer.id);
    setEditAppliesTo(offer.appliesTo);
    setEditDiscountType(offer.discountType);
    setEditDiscountMethod(offer.discountMethod);
    setEditProductIds(asArrayFromStorage(offer.productIds));
    setEditCollectionIds(asArrayFromStorage(offer.collectionIds));
  };
  const chooseEditResources = async () => {
    const resources = await shopify.resourcePicker({
      type: editAppliesTo === "products" ? "product" : "collection",
      multiple: true,
    });
    if (!resources) return;
    const ids = resources.map((resource) => resource.id);
    if (editAppliesTo === "products") setEditProductIds(ids);
    else setEditCollectionIds(ids);
  };

  return (
    <s-page heading="Surprise Discount">
      <s-button-group slot="primary-action">
        <s-button
          variant={tab === "offers" ? "primary" : "secondary"}
          onClick={() => setTab("offers")}
        >
          Offers
        </s-button>
        <s-button
          variant={tab === "analytics" ? "primary" : "secondary"}
          onClick={() => setTab("analytics")}
        >
          Analytics
        </s-button>
      </s-button-group>
      {tab === "offers" ? (
        <>
          <s-section heading="Create offer">
            <Form method="post">
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Name"
                  name="name"
                  required
                  placeholder="Weekend surprise"
                />
                <s-select label="Discount type" name="discountType">
                  <s-option value="percentage">Percentage</s-option>
                  <s-option value="fixed">Fixed amount</s-option>
                </s-select>
                <s-number-field
                  label="Discount value"
                  name="discountValue"
                  min={0.01}
                  step={0.01}
                  required
                />
                <s-select label="Discount delivery" name="discountMethod">
                  <s-option value="coupon">Coupon code</s-option>
                  <s-option value="automatic">Automatic discount</s-option>
                </s-select>
                <s-select
                  label="Apply to"
                  name="appliesTo"
                  value={appliesTo}
                  onChange={(event: Event) =>
                    setAppliesTo((event.target as HTMLSelectElement).value)
                  }
                >
                  <s-option value="all">All products</s-option>
                  <s-option value="collections">Specific collections</s-option>
                  <s-option value="products">Specific products</s-option>
                </s-select>
                {appliesTo !== "all" && (
                  <>
                    <input
                      type="hidden"
                      name="productIds"
                      value={JSON.stringify(productIds)}
                    />
                    <input
                      type="hidden"
                      name="collectionIds"
                      value={JSON.stringify(collectionIds)}
                    />
                    <s-button type="button" onClick={chooseResources}>
                      Choose {appliesTo}
                    </s-button>
                    <s-paragraph>
                      {selectedIds.length
                        ? `${selectedIds.length} ${appliesTo} selected`
                        : `No ${appliesTo} selected`}
                    </s-paragraph>
                  </>
                )}
                <label>
                  Start date and time{" "}
                  <input
                    name="startDate"
                    type="datetime-local"
                    defaultValue={now}
                    required
                  />
                </label>
                <label>
                  End date and time{" "}
                  <input
                    name="endDate"
                    type="datetime-local"
                    defaultValue={defaultEnd}
                    required
                  />
                </label>
                <s-checkbox
                  name="combinesWithOther"
                  label="Combine with other discounts"
                />
                <s-button type="submit" variant="primary" loading={isCreating}>
                  Create offer
                </s-button>
              </s-stack>
            </Form>
          </s-section>
          <s-section heading="Your offers">
            <s-table>
              <s-table-header-row>
                <s-table-header>Offer</s-table-header>
                <s-table-header>Value</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Ends</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {offers.map((offer) => (
                  <s-table-row key={offer.id}>
                    <s-table-cell>{offer.name}</s-table-cell>
                    <s-table-cell>
                      {offer.discountType === "percentage"
                        ? `${offer.discountValue}%`
                        : money(offer.discountValue)}
                    </s-table-cell>
                    <s-table-cell>{displayStatus(offer.status)}</s-table-cell>
                    <s-table-cell>
                      {offer.endDate.toLocaleDateString()}
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small">
                        <s-button
                          type="button"
                          commandFor="edit-offer-modal"
                          command="--show"
                          onClick={() => openEditOffer(offer)}
                        >
                          Edit
                        </s-button>
                        <Form method="post">
                          <input
                            type="hidden"
                            name="intent"
                            value="deleteOffer"
                          />
                          <input
                            type="hidden"
                            name="offerId"
                            value={offer.id}
                          />
                          <s-button type="submit" variant="secondary" loading={isDeleting}>
                            Delete
                          </s-button>
                        </Form>
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
          <s-modal
            id="edit-offer-modal"
            heading={editingOffer ? `Edit ${editingOffer.name}` : "Edit offer"}
          >
            {editingOffer && (
              <>
                <Form method="post" id="edit-offer-form">
                  <input type="hidden" name="intent" value="editOffer" />
                  <input type="hidden" name="offerId" value={editingOffer.id} />
                  <input
                    type="hidden"
                    name="editProductIds"
                    value={JSON.stringify(editProductIds)}
                  />
                  <input
                    type="hidden"
                    name="editCollectionIds"
                    value={JSON.stringify(editCollectionIds)}
                  />
                  <s-stack direction="block" gap="base">
                    <s-text-field
                      label="Name"
                      name="editName"
                      defaultValue={editingOffer.name}
                      required
                    />
                    <s-select
                      label="Discount type"
                      name="editDiscountType"
                      value={editDiscountType}
                      onChange={(event: Event) =>
                        setEditDiscountType(
                          (event.target as HTMLSelectElement).value,
                        )
                      }
                    >
                      <s-option value="percentage">Percentage</s-option>
                      <s-option value="fixed">Fixed amount</s-option>
                    </s-select>
                    <s-number-field
                      label="Discount value"
                      name="editDiscountValue"
                      min={0.01}
                      step={0.01}
                      defaultValue={String(editingOffer.discountValue)}
                      required
                    />
                    <s-select
                      label="Discount delivery"
                      name="editDiscountMethod"
                      value={editDiscountMethod}
                      onChange={(event: Event) =>
                        setEditDiscountMethod(
                          (event.target as HTMLSelectElement).value,
                        )
                      }
                    >
                      <s-option value="coupon">Coupon code</s-option>
                      <s-option value="automatic">Automatic discount</s-option>
                    </s-select>
                    <s-select
                      label="Apply to"
                      name="editAppliesTo"
                      value={editAppliesTo}
                      onChange={(event: Event) =>
                        setEditAppliesTo(
                          (event.target as HTMLSelectElement).value,
                        )
                      }
                    >
                      <s-option value="all">All products</s-option>
                      <s-option value="collections">
                        Specific collections
                      </s-option>
                      <s-option value="products">Specific products</s-option>
                    </s-select>
                    {editAppliesTo !== "all" && (
                      <>
                        <s-button type="button" onClick={chooseEditResources}>
                          Choose {editAppliesTo}
                        </s-button>
                        <s-paragraph>
                          {
                            (editAppliesTo === "products"
                              ? editProductIds
                              : editCollectionIds
                            ).length
                          }{" "}
                          {editAppliesTo} selected
                        </s-paragraph>
                      </>
                    )}
                    <label>
                      Start date and time{" "}
                      <input
                        name="editStartDate"
                        type="datetime-local"
                        defaultValue={dateInput(editingOffer.startDate)}
                        required
                      />
                    </label>
                    <label>
                      End date and time{" "}
                      <input
                        name="editEndDate"
                        type="datetime-local"
                        defaultValue={dateInput(editingOffer.endDate)}
                        required
                      />
                    </label>
                    <s-checkbox
                      name="editCombinesWithOther"
                      label="Combine with other discounts"
                      checked={editingOffer.combinesWithOther}
                    />
                  </s-stack>
                </Form>
                <div
                  style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: "100%",
                    boxSizing: "border-box",
                    borderTop: "1px solid #d1d5db",
                    backgroundColor: "#f6f6f7",
                    paddingBlock: "16px",
                    paddingInline: "24px",
                    zIndex: 1,
                  }}
                >
                  <s-stack direction="inline" gap="base">
                    <s-button
                      type="button"
                      onClick={() =>
                        (
                          document.getElementById(
                            "edit-offer-form",
                          ) as HTMLFormElement | null
                        )?.requestSubmit()
                      }
                      variant="primary"
                      loading={isEditing}
                    >
                      Save changes
                    </s-button>
                    <s-button
                      type="button"
                      onClick={() => setEditingOfferId(null)}
                    >
                      Cancel
                    </s-button>
                    <s-button
                      type="button"
                      tone="critical"
                      loading={isDeleting}
                      onClick={() =>
                        (
                          document.getElementById(
                            "delete-offer-form",
                          ) as HTMLFormElement | null
                        )?.requestSubmit()
                      }
                    >
                      Delete
                    </s-button>

                  </s-stack>
                </div>
                <Form method="post" id="delete-offer-form">
                  <input type="hidden" name="intent" value="deleteOffer" />
                  <input type="hidden" name="offerId" value={editingOffer.id} />
                </Form>
              </>
            )}
          </s-modal>
        </>
      ) : (
        <>
          <s-section>
            <s-stack direction="inline" gap="base">
              <Kpi label="Active offers" value={analytics.kpis.activeOffers} />
              <Kpi
                label="Redemptions (30d)"
                value={analytics.kpis.redemptions}
              />
              <Kpi
                label="Discount given"
                value={money(analytics.kpis.discountAmount)}
              />
              <Kpi
                label="Order value influenced"
                value={money(analytics.kpis.orderValue)}
              />
            </s-stack>
          </s-section>
          <s-section heading="Redemptions per day">
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#008060" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </s-section>
          <s-section heading="Top offers">
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={analytics.topOffers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="redemptions" fill="#2c6ecb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </s-section>
          <s-section heading="Per-offer breakdown">
            <s-table>
              <s-table-header-row>
                <s-table-header>Offer</s-table-header>
                <s-table-header>Redemptions</s-table-header>
                <s-table-header>Discount given</s-table-header>
                <s-table-header>Avg. order</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {analytics.breakdown.map((row) => (
                  <s-table-row key={row.offerId}>
                    <s-table-cell>{row.name}</s-table-cell>
                    <s-table-cell>{row.redemptions}</s-table-cell>
                    <s-table-cell>{money(row.discountAmount)}</s-table-cell>
                    <s-table-cell>{money(row.avgOrderValue)}</s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
        </>
      )}
    </s-page>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-paragraph>{label}</s-paragraph>
      <s-heading>{value}</s-heading>
    </s-box>
  );
}
