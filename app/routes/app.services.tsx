import { Button, Card, Layout, Page, Text } from "@shopify/polaris";
import { useNavigate } from "react-router";

const services = [
  {
    icon: "▭",
    title: "Custom theme design",
    description:
      "A storefront built around your product photography and brand, not a stock template.",
  },
  {
    icon: "‹›",
    title: "Custom app development",
    description:
      "Bespoke checkout logic, integrations, or internal tools built on the Shopify API.",
  },
  {
    icon: "⌁",
    title: "Migration & performance",
    description:
      "Moving off another platform, or speeding up a slow storefront, done without downtime.",
  },
];

const bannerStyle = {
  background: "linear-gradient(120deg, #29205a 0%, #4c399e 100%)",
  borderRadius: 18,
  color: "#ffffff",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "2rem",
  padding: "2.75rem 3rem",
};

export default function ServicesPage() {
  const navigate = useNavigate();

  return (
    <Page
      title="Services"
      subtitle="Extend your Shopify store with thoughtful design and development support."
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <div style={bannerStyle}>
            <div style={{ maxWidth: 650 }}>
              <p style={{ color: "#ddd8f3", fontSize: "0.9rem", margin: 0 }}>
                A message from Northfield Digital, the team behind Answerly
              </p>
              <div style={{ marginTop: "0.9rem" }}>
                <h2 style={{ color: "#ffffff", fontSize: "2rem", lineHeight: 1.15, margin: 0 }}>
                  We also build Shopify stores, themes, custom apps, and migrations.
                </h2>
              </div>
              <div style={{ marginTop: "1rem", maxWidth: 620 }}>
                <p style={{ color: "#ddd8f3", fontSize: "1rem", lineHeight: 1.6, margin: 0 }}>
                  Answerly is one of the apps we build for merchants like you. If
                  you&apos;re planning a redesign, a theme migration, or a custom app
                  of your own, our team can take it on directly.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.75rem" }}>
                <Button url="https://calendly.com/heseven/30min" external variant="primary" tone="success">
                  Book a free 20-min audit
                </Button>
                <Button url="https://www.heseven.com/" external>
                  See our work
                </Button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                alignContent: "center",
                gap: "1.35rem",
                minWidth: 125,
                textAlign: "right",
              }}
            >
              <Stat value="140+" label="Shopify stores shipped" />
              <Stat value="4.9/5" label="Average client rating" />
              <Stat value="6 yrs" label="Shopify Partner" />
            </div>
          </div>
        </Layout.Section>

        <Layout.Section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
            }}
          >
            {services.map((service) => (
              <Card key={service.title}>
                <div style={{ display: "flex", flexDirection: "column", minHeight: 205 }}>
                  <div
                    aria-hidden="true"
                    style={{
                      alignItems: "center",
                      background: "#fff4df",
                      borderRadius: 10,
                      color: "#b87518",
                      display: "flex",
                      fontSize: 25,
                      height: 40,
                      justifyContent: "center",
                      lineHeight: 1,
                      width: 40,
                    }}
                  >
                    {service.icon}
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    <Text as="h3" variant="headingMd">
                      {service.title}
                    </Text>
                  </div>
                  <div style={{ marginTop: "0.6rem" }}>
                    <Text as="p" tone="subdued">
                      {service.description}
                    </Text>
                  </div>
                  <div style={{ marginTop: "auto", paddingTop: "1.25rem" }}>
                    <Button url="https://www.heseven.com/pages/contact-us" external variant="plain">
                      Get a quote →
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p style={{ color: "#ffffff", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
        {value}
      </p>
      <p style={{ color: "#cfc9e9", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
        {label}
      </p>
    </div>
  );
}