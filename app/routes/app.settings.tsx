import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Button, Card, FormLayout, Layout, Page, Select, Text } from "@shopify/polaris";
import db from "../db.server";
import { offerStatus } from "../offers.server";
import { authenticate } from "../shopify.server";
import { defaultBlockSettings, readBlockSettings, syncOfferToBlock, type BlockSettings } from "../storefront-settings.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const [blockSettings, offers] = await Promise.all([
    readBlockSettings(admin),
    db.offer.findMany({ where: { shop: session.shop }, orderBy: { createdAt: "desc" } }),
  ]);
  return { blockSettings, offers: offers.map((offer) => ({ ...offer, status: offerStatus(offer) })) };
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const currentSettings = await readBlockSettings(admin);
  const selectedOfferId = String(form.get("selectedOfferId") ?? currentSettings.selectedOfferId);
  const selectedOffer = await db.offer.findFirst({ where: { id: selectedOfferId, shop: session.shop } });
  const settings: BlockSettings = {
    ...currentSettings,
    selectedOfferId,
    message: String(form.get("blockMessage") ?? defaultBlockSettings.message).trim() || defaultBlockSettings.message,
    buttonLabel: String(form.get("buttonLabel") ?? defaultBlockSettings.buttonLabel).trim() || defaultBlockSettings.buttonLabel,
    backgroundColor: String(form.get("backgroundColor") ?? defaultBlockSettings.backgroundColor),
    textColor: String(form.get("textColor") ?? defaultBlockSettings.textColor),
    buttonColor: String(form.get("buttonColor") ?? defaultBlockSettings.buttonColor),
    buttonTextColor: String(form.get("buttonTextColor") ?? defaultBlockSettings.buttonTextColor),
    buttonRadius: Math.min(32, Math.max(0, Number(form.get("buttonRadius")) || defaultBlockSettings.buttonRadius)),
    containerRadius: Math.min(32, Math.max(0, Number(form.get("containerRadius")) || defaultBlockSettings.containerRadius)),
    messageSizeDesktop: Math.min(40, Math.max(12, Number(form.get("messageSizeDesktop")) || defaultBlockSettings.messageSizeDesktop)),
    messageSizeMobile: Math.min(32, Math.max(10, Number(form.get("messageSizeMobile")) || defaultBlockSettings.messageSizeMobile)),
    automaticDiscountText: String(form.get("automaticDiscountText") ?? defaultBlockSettings.automaticDiscountText).trim() || defaultBlockSettings.automaticDiscountText,
    currentPriceText: String(form.get("currentPriceText") ?? defaultBlockSettings.currentPriceText).trim() || defaultBlockSettings.currentPriceText,
  };
  try {
    await syncOfferToBlock(admin, settings, selectedOffer);
    return { success: "Storefront block settings saved." };
  } catch (error) {
    return { error: `Could not save storefront settings: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export default function Settings() {
  const { blockSettings, offers } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge() as unknown as {
    toast: { show: (message: string, options?: { isError?: boolean; duration?: number }) => string };
  };
  const saving = navigation.state === "submitting";

  const [formValues, setFormValues] = useState({
    blockMessage: blockSettings.message,
    buttonLabel: blockSettings.buttonLabel,
    selectedOfferId: blockSettings.selectedOfferId || offers[0]?.id || "",
    backgroundColor: blockSettings.backgroundColor,
    textColor: blockSettings.textColor,
    buttonColor: blockSettings.buttonColor,
    buttonTextColor: blockSettings.buttonTextColor,
    buttonRadius: blockSettings.buttonRadius,
    containerRadius: blockSettings.containerRadius,
    messageSizeDesktop: blockSettings.messageSizeDesktop,
    messageSizeMobile: blockSettings.messageSizeMobile,
    automaticDiscountText: blockSettings.automaticDiscountText,
    currentPriceText: blockSettings.currentPriceText,
    discountMode: blockSettings.discountMode,
    discountType: blockSettings.discountType,
    discountValue: blockSettings.discountValue,
  });

  useEffect(() => {
    setFormValues({
      blockMessage: blockSettings.message,
      buttonLabel: blockSettings.buttonLabel,
      selectedOfferId: blockSettings.selectedOfferId || offers[0]?.id || "",
      backgroundColor: blockSettings.backgroundColor,
      textColor: blockSettings.textColor,
      buttonColor: blockSettings.buttonColor,
      buttonTextColor: blockSettings.buttonTextColor,
      buttonRadius: blockSettings.buttonRadius,
      containerRadius: blockSettings.containerRadius,
      messageSizeDesktop: blockSettings.messageSizeDesktop,
      messageSizeMobile: blockSettings.messageSizeMobile,
      automaticDiscountText: blockSettings.automaticDiscountText,
      currentPriceText: blockSettings.currentPriceText,
      discountMode: blockSettings.discountMode,
      discountType: blockSettings.discountType,
      discountValue: blockSettings.discountValue,
    });
  }, [blockSettings, offers]);

  useEffect(() => {
    if (result?.success) shopify.toast.show(result.success, { isError: false, duration: 4000 });
    if (result?.error) shopify.toast.show(result.error, { isError: true, duration: 6000 });
  }, [result, shopify]);

  const updateValue = <Key extends keyof typeof formValues>(key: Key, value: (typeof formValues)[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  const previewStyles = {
    background: formValues.backgroundColor,
    color: formValues.textColor,
    borderRadius: `${formValues.containerRadius}px`,
    padding: "28px",
    maxWidth: 540,
    margin: "0 auto",
    textAlign: "center" as const,
    border: "1px solid rgba(17, 24, 39, 0.08)",
  };

  const previewRewardText = (() => {
    const numericValue = Number(formValues.discountValue || 0);
    const displayValue = formValues.discountType === "percentage" ? `${numericValue}%` : `$${numericValue}`;
    return formValues.automaticDiscountText.replace(/\{discount\}/gi, displayValue);
  })();
  const previewOriginalPrice = 100;
  const previewDiscount = formValues.discountType === "percentage"
    ? previewOriginalPrice * Number(formValues.discountValue || 0) / 100
    : Number(formValues.discountValue || 0);
  const previewDiscountedPrice = Math.max(0, previewOriginalPrice - previewDiscount);

  return (
    <Page title="Settings" subtitle="Customize how the storefront discount block appears to shoppers.">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: "1rem" }}>
              <Form method="post">
                <FormLayout>
                  <Select
                    label="Offer shown in storefront block"
                    name="selectedOfferId"
                    value={formValues.selectedOfferId || offers[0]?.id || ""}
                    onChange={(value) => updateValue("selectedOfferId", value || "")}
                    options={
                      offers.length
                        ? offers.map((offer) => ({ label: `${offer.name} (${offer.status})`, value: offer.id }))
                        : [{ label: "No offers available", value: "" }]
                    }
                  />
                  <Text as="p" tone="subdued">
                    This decides which discount or coupon is shown in the block. It is important because it controls the reward, coupon code, and product targeting. You can leave it empty while styling only, but the block will not show a live offer until one is selected.
                  </Text>

                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Message</span>
                    <input
                      name="blockMessage"
                      value={formValues.blockMessage}
                      onChange={(event) => updateValue("blockMessage", event.target.value)}
                      required
                      style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Discounted price text</span>
                    <input
                      name="currentPriceText"
                      value={formValues.currentPriceText}
                      onChange={(event) => updateValue("currentPriceText", event.target.value)}
                      placeholder="Current product price after discount"
                      style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button text</span>
                    <input
                      name="buttonLabel"
                      value={formValues.buttonLabel}
                      onChange={(event) => updateValue("buttonLabel", event.target.value)}
                      required
                      style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Automatic discount text</span>
                    <input
                      name="automaticDiscountText"
                      value={formValues.automaticDiscountText}
                      onChange={(event) => updateValue("automaticDiscountText", event.target.value)}
                      placeholder="You get {discount} off this product"
                      style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                    />
                    <Text as="span" tone="subdued">
                      This text only works for automatic discounts. It does not apply to discount code offers. Use {'{discount}'} to insert the actual offer value automatically. Example: “You get {'{discount}'} off this product”.
                    </Text>
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Background</span>
                      <input
                        type="color"
                        name="backgroundColor"
                        value={formValues.backgroundColor}
                        onChange={(event) => updateValue("backgroundColor", event.target.value)}
                        style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Text</span>
                      <input
                        type="color"
                        name="textColor"
                        value={formValues.textColor}
                        onChange={(event) => updateValue("textColor", event.target.value)}
                        style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button</span>
                      <input
                        type="color"
                        name="buttonColor"
                        value={formValues.buttonColor}
                        onChange={(event) => updateValue("buttonColor", event.target.value)}
                        style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button text</span>
                      <input
                        type="color"
                        name="buttonTextColor"
                        value={formValues.buttonTextColor}
                        onChange={(event) => updateValue("buttonTextColor", event.target.value)}
                        style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button corner radius</span>
                      <input
                        type="number"
                        name="buttonRadius"
                        min={0}
                        max={32}
                        value={formValues.buttonRadius}
                        onChange={(event) => updateValue("buttonRadius", Math.min(32, Math.max(0, Number(event.target.value) || 0)))}
                        style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Container corner radius</span>
                      <input
                        type="number"
                        name="containerRadius"
                        min={0}
                        max={32}
                        value={formValues.containerRadius}
                        onChange={(event) => updateValue("containerRadius", Math.min(32, Math.max(0, Number(event.target.value) || 0)))}
                        style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Message size desktop (px)</span>
                      <input
                        type="number"
                        name="messageSizeDesktop"
                        min={12}
                        max={40}
                        value={formValues.messageSizeDesktop}
                        onChange={(event) => updateValue("messageSizeDesktop", Math.min(40, Math.max(12, Number(event.target.value) || 18)))}
                        style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Message size mobile (px)</span>
                      <input
                        type="number"
                        name="messageSizeMobile"
                        min={10}
                        max={32}
                        value={formValues.messageSizeMobile}
                        onChange={(event) => updateValue("messageSizeMobile", Math.min(32, Math.max(10, Number(event.target.value) || 16)))}
                        style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }}
                      />
                    </label>
                  </div>

                  <Button submit loading={saving} variant="primary">
                    Save storefront block
                  </Button>
                </FormLayout>
              </Form>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: "1rem 1rem 0" }}>
              <Text as="h2" variant="headingSm">
                Live preview
              </Text>
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 16, padding: "1.25rem", margin: "1rem" }}>
              <div style={previewStyles}>
                <p style={{ margin: "0 0 18px", fontSize: `${formValues.messageSizeDesktop}px`, lineHeight: 1.45 }}>{formValues.blockMessage}</p>
                {formValues.discountMode === "automatic" && (
                  <p style={{ margin: "0 0 18px", fontSize: `${formValues.messageSizeDesktop}px`, lineHeight: 1.45, fontWeight: 600 }}>
                    {previewRewardText}
                  </p>
                )}
                <p style={{ margin: "0 0 18px", fontSize: `${formValues.messageSizeDesktop}px`, lineHeight: 1.45, fontWeight: 600 }}>
                  {formValues.currentPriceText}: <strong>${previewDiscountedPrice.toFixed(2)}</strong>{" "}
                  <span style={{ opacity: 0.65, textDecoration: "line-through", fontWeight: 400 }}>${previewOriginalPrice.toFixed(2)}</span>
                </p>
                <button
                  type="button"
                  style={{
                    appearance: "none",
                    border: 0,
                    borderRadius: `${formValues.buttonRadius}px`,
                    background: formValues.buttonColor,
                    color: formValues.buttonTextColor,
                    cursor: "pointer",
                    display: "block",
                    font: "inherit",
                    fontWeight: 700,
                    margin: "0 auto",
                    width: "min(100%, 430px)",
                    padding: "13px 24px",
                  }}
                >
                  {formValues.buttonLabel}
                </button>
              </div>
            </div>
            <div style={{ padding: "0 1rem 1rem" }}>
              <Text as="p" tone="subdued">
                This is a live mockup of the final app block as it appears on product pages. It helps you preview the look before saving.
              </Text>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}