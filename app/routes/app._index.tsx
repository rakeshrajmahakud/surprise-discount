import { Badge, Box, Button, Card, Layout, Link, Page, Text } from "@shopify/polaris";
import { useNavigate } from "react-router";

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

export default function HomePage() {
  const navigate = useNavigate();

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
                <Button url="/app/offers" variant="primary">Create offer</Button>
                <Button url="https://shopify.dev/docs/apps/build/online-store/theme-app-extensions" external>Theme app docs</Button>
              </div>
            </Box>
          </Card>
        </Layout.Section>

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
      </Layout>
    </Page>
  );
}