import { Badge, Box, Button, Card, Layout, Link, Page, Text } from "@shopify/polaris";
import { useLoaderData, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { analyticsOverview } from "../analytics.server";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { readBlockSettings } from "../storefront-settings.server";

const steps = [
  {
    icon: "🧩",
    title: "Create an offer",
    description:
      "Go to the Offers page and create your first surprise discount. Add a name, discount value, products or collections, and the valid date range.",
  },
  {
    icon: "🎯",
    title: "Add to product page block",
    description:
      "Open your Shopify theme editor, click Add block, choose Surprise Discount, and place it in a product page section so it appears where customers view the product.",
  },
  {
    icon: "🛍️",
    title: "Preview on product page",
    description:
      "Visit a product page where the block is placed, test the reveal flow, and confirm the message appears correctly.",
  },
  {
    icon: "📈",
    title: "Track results",
    description:
      "Come back here and open Analytics to see redemptions, top offers, and conversion impact over time.",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const [blockSettings, offerCount, analytics] = await Promise.all([
    readBlockSettings(admin),
    db.offer.count({ where: { shop: session.shop } }),
    analyticsOverview(session.shop),
  ]);
  return {
    isSetupComplete: blockSettings.offerReady && offerCount > 0,
    analytics,
  };
}

export default function HomePage() {
  const { isSetupComplete, analytics } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(value);

  return (
    <Page title="Dashboard" subtitle="Welcome to your Surprise Discount app dashboard.">
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="400">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <Badge tone="info">Getting started</Badge>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <Text as="h2" variant="headingXl">Welcome to your store growth dashboard</Text>
              </div>
              <div style={{ marginTop: "0.75rem", maxWidth: "52rem" }}>
                <Text as="p" tone="subdued">
                  Launch a surprise promotion in minutes. Build a discount, add the app block to your theme, and monitor how customers respond.
                </Text>
              </div>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Button onClick={() => navigate("/app/offers")} variant="primary">Create offer</Button>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        {!isSetupComplete ? (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text as="h3" variant="headingMd">Step-by-step setup guide</Text>
                <div style={{ display: "grid", gap: "1rem", marginTop: "1.25rem" }}>
                  {steps.map((step, index) => (
                    <div
                      key={step.title}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: "1rem",
                        padding: "1rem",
                        borderRadius: "1rem",
                        background: index % 2 === 0 ? "#f8fafc" : "#f5f3ff",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          width: "2.75rem",
                          height: "2.75rem",
                          borderRadius: "999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "linear-gradient(135deg, #dbeafe, #e9d5ff)",
                          fontSize: "1.5rem",
                          boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.08)",
                        }}
                      >
                        {step.icon}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                          <Text as="span" variant="headingSm">Step {index + 1}</Text>
                          <Badge tone="success">{step.title}</Badge>
                        </div>
                        <Text as="p" tone="subdued">{step.description}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </Box>
            </Card>
          </Layout.Section>
        ) : (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <Text as="h3" variant="headingMd">Performance summary</Text>
                    <div style={{ marginTop: "0.35rem" }}>
                      <Text as="p" tone="subdued">Your store is set up. Here is how your offers are performing over the last 30 days.</Text>
                    </div>
                  </div>
                  <Button onClick={() => navigate("/app/analytics")}>View analytics</Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <SummaryMetric label="Active offers" value={analytics.kpis.activeOffers} />
                  <SummaryMetric label="Redemptions" value={analytics.kpis.redemptions} />
                  <SummaryMetric label="Discount given" value={money(analytics.kpis.discountAmount)} />
                  <SummaryMetric label="Revenue influenced" value={money(analytics.kpis.orderValue)} />
                </div>
                <div style={{ marginTop: "1.25rem" }}>
                  <Text as="h4" variant="headingSm">Top offers</Text>
                  {analytics.topOffers.length ? (
                    <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
                      {analytics.topOffers.slice(0, 3).map((offer) => (
                        <div key={offer.offerId} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "1px solid #e1e3e5", padding: "0.6rem 0" }}>
                          <Text as="span">{offer.name}</Text>
                          <Text as="span" tone="subdued">{offer.redemptions} redemption{offer.redemptions === 1 ? "" : "s"}</Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: "0.75rem" }}>
                      <Text as="p" tone="subdued">No redemptions yet. Your offer performance will appear here as customers use your discounts.</Text>
                    </div>
                  )}
                </div>
              </Box>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Box padding="400">
              <Text as="h3" variant="headingMd">Quick overview</Text>
              <ul style={{ margin: "1rem 0 0 1.25rem", padding: 0, lineHeight: "1.9", color: "#374151" }}>
                <li>Create and manage surprise discount offers.</li>
                <li>Pick products, collections, or the whole store.</li>
                <li>Monitor redemptions and offer performance in Analytics.</li>
              </ul>
              <div style={{ marginTop: "1.25rem" }}>
                <Link onClick={() => navigate("/app/analytics")} monochrome>Open analytics</Link>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <div
            style={{
              background: "linear-gradient(135deg, #29205a 0%, #403080 100%)",
              borderRadius: "1rem",
              color: "#ffffff",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 8rem",
              gap: "2rem",
              padding: "2rem 1.5rem",
            }}
          >
            <div style={{ maxWidth: "34rem" }}>
              <h2 style={{ color: "#ffffff", fontSize: "1.5rem", lineHeight: 1.25, margin: 0 }}>
                Want your storefront redesigned to match?
              </h2>
              <div style={{ marginTop: "1rem" }}>
                <p style={{ color: "#e8e5f5", fontSize: "1.05rem", lineHeight: 1.6, margin: 0 }}>
                  We build the themes and custom apps this widget lives in. Free
                  20-minute audit of your product pages.
                </p>
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                <Button onClick={() => navigate("/app/services")} variant="secondary">
                  See services
                </Button>
              </div>
            </div>
            <div
              aria-hidden="true"
              style={{
                alignItems: "center",
                alignSelf: "center",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                borderRadius: "2rem",
                display: "flex",
                fontSize: "4rem",
                height: "8rem",
                justifyContent: "center",
                lineHeight: 1,
                width: "8rem",
              }}
            >
              ✦
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e1e3e5", borderRadius: "0.75rem", padding: "0.85rem" }}>
      <Text as="p" tone="subdued">{label}</Text>
      <div style={{ marginTop: "0.35rem" }}>
        <Text as="p" variant="headingLg">{value}</Text>
      </div>
    </div>
  );
}