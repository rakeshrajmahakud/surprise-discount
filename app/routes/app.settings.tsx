import { useEffect } from "react";
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

  useEffect(() => {
    if (result?.success) shopify.toast.show(result.success, { isError: false, duration: 4000 });
    if (result?.error) shopify.toast.show(result.error, { isError: true, duration: 6000 });
  }, [result, shopify]);

  return (
    <Page title="Settings" subtitle="Customize how the storefront discount block appears to shoppers.">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: "1rem" }}>
              <Form method="post">
                <FormLayout>
                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Message</span>
                    <input name="blockMessage" defaultValue={blockSettings.message} required style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }} />
                  </label>

                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button text</span>
                    <input name="buttonLabel" defaultValue={blockSettings.buttonLabel} required style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }} />
                  </label>

                  <Select
                    label="Offer shown in storefront block"
                    name="selectedOfferId"
                    value={blockSettings.selectedOfferId || offers[0]?.id || ""}
                    options={
                      offers.length
                        ? offers.map((offer) => ({ label: `${offer.name} (${offer.status})`, value: offer.id }))
                        : [{ label: "No offers available", value: "" }]
                    }
                  />
                  <Text as="p" tone="subdued">
                    The selected offer controls the discount, coupon code, and product targeting in the storefront block.
                  </Text>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Background</span>
                      <input type="color" name="backgroundColor" defaultValue={blockSettings.backgroundColor} style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Text</span>
                      <input type="color" name="textColor" defaultValue={blockSettings.textColor} style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button</span>
                      <input type="color" name="buttonColor" defaultValue={blockSettings.buttonColor} style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.5rem" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button text</span>
                      <input type="color" name="buttonTextColor" defaultValue={blockSettings.buttonTextColor} style={{ width: "100%", minHeight: 42, borderRadius: 8, border: "1px solid #d1d5db" }} />
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Button corner radius</span>
                    <input type="number" name="buttonRadius" min={0} max={32} defaultValue={String(blockSettings.buttonRadius)} style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid #d1d5db", padding: "0.625rem 0.75rem" }} />
                  </label>

                  <Button submit loading={saving} variant="primary">
                    Save storefront block
                  </Button>
                </FormLayout>
              </Form>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}