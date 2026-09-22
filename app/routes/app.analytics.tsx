import { useEffect, useState } from "react";
import { Form, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LoaderFunctionArgs } from "react-router";
import { Badge, Button, Card, Layout, Page, Select, Text } from "@shopify/polaris";
import { analyticsOverview } from "../analytics.server";
import { authenticate } from "../shopify.server";

const allowedRanges = [7, 30, 90] as const;
type AnalyticsRange = typeof allowedRanges[number];

const parseRange = (value: string | null): AnalyticsRange => {
  const range = Number(value);
  return allowedRanges.includes(range as AnalyticsRange) ? (range as AnalyticsRange) : 30;
};

const formatMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatShortDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

const chartColors = ["#2f80ed", "#27ae60", "#f2994a", "#9b51e0", "#eb5757"];

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range"));
  return { analytics: await analyticsOverview(session.shop, range), range };
}

export default function AnalyticsPage() {
  const { analytics, range } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [selectedRange, setSelectedRange] = useState(String(range));
  const loading = navigation.state === "loading";
  useEffect(() => {
    setSelectedRange(String(range));
  }, [range]);
  const chartData = analytics.dailyRedemptions.map((row) => ({
    ...row,
    label: formatShortDate(row.date),
  }));
  const hasData = analytics.kpis.redemptions > 0;

  return (
    <Page
      title="Analytics"
      subtitle="Track redemptions, conversion impact, and top-performing offers."
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      primaryAction={
        <Form method="get">
          <div style={{ display: "flex", alignItems: "end", gap: "0.75rem" }}>
            <div style={{ minWidth: 180 }}>
              <Select
                label="Date range"
                name="range"
                value={selectedRange}
                onChange={setSelectedRange}
                options={[
                  { label: "Last 7 days", value: "7" },
                  { label: "Last 30 days", value: "30" },
                  { label: "Last 90 days", value: "90" },
                ]}
              />
            </div>
            <Button submit loading={loading}>Apply</Button>
          </div>
        </Form>
      }
    >
      <Layout>
        <Layout.Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <Kpi label="Active offers" value={analytics.kpis.activeOffers} accent="#2f80ed" />
            <Kpi label="Redemptions" value={analytics.kpis.redemptions} accent="#27ae60" />
            <Kpi label="Discount given" value={formatMoney(analytics.kpis.discountAmount)} accent="#f2994a" />
            <Kpi label="Revenue influenced" value={formatMoney(analytics.kpis.orderValue)} accent="#9b51e0" />
          </div>
        </Layout.Section>

        {!hasData ? (
          <Layout.Section>
            <Card>
              <div style={{ padding: "1rem" }}>
                <Text as="h2" variant="headingMd">Analytics will appear here</Text>
                <div style={{ marginTop: "0.75rem" }}>
                  <Text as="p" tone="subdued">
                    Once customers redeem an offer, this page will show trends and offer performance for the selected period.
                  </Text>
                </div>
              </div>
            </Card>
          </Layout.Section>
        ) : (
          <>
            <Layout.Section>
              <Card>
                <div style={{ padding: "1rem 1rem 0.25rem" }}>
                  <Text as="h3" variant="headingMd">Redemptions in the last {range} days</Text>
                </div>
                <div style={{ padding: "0 1rem 1rem", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#27ae60" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#27ae60" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#dfe7ef" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#dfe7ef" }} tick={{ fill: "#475569", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: "#dfe7ef" }} tick={{ fill: "#475569", fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => [Number(value ?? 0), "Redemptions"] as [number, string]}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ borderRadius: 12, border: "1px solid #dfe7ef", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#27ae60" strokeWidth={3} dot={{ r: 3, fill: "#27ae60" }} activeDot={{ r: 5 }} fill="url(#trendFill)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <div style={{ padding: "1rem 1rem 0.25rem" }}>
                  <Text as="h3" variant="headingMd">Top offers</Text>
                </div>
                <div style={{ padding: "0 1rem 1rem", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topOffers} margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
                      <CartesianGrid stroke="#dfe7ef" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#dfe7ef" }} tick={{ fill: "#475569", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: "#dfe7ef" }} tick={{ fill: "#475569", fontSize: 12 }} />
                      <Tooltip formatter={(value) => [Number(value ?? 0), "Redemptions"] as [number, string]} contentStyle={{ borderRadius: 12, border: "1px solid #dfe7ef", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" }} />
                      <Bar dataKey="redemptions" radius={[8, 8, 0, 0]}>
                        {analytics.topOffers.map((offer, index) => (
                          <Cell key={offer.offerId} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Layout.Section>
          </>
        )}

        <Layout.Section>
          <Card>
            <div style={{ padding: "1rem 1rem 0.25rem" }}>
              <Text as="h3" variant="headingMd">Offer performance</Text>
            </div>
            <div style={{ padding: "0 1rem 1rem" }}>
              {analytics.breakdown.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", borderBottom: "1px solid #e1e3e5" }}>Offer</th>
                        <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", borderBottom: "1px solid #e1e3e5" }}>Redemptions</th>
                        <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", borderBottom: "1px solid #e1e3e5" }}>Discount given</th>
                        <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", borderBottom: "1px solid #e1e3e5" }}>Revenue influenced</th>
                        <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", borderBottom: "1px solid #e1e3e5" }}>Average order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.breakdown.map((offer) => (
                        <tr key={offer.offerId}>
                          <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid #f0f2f4" }}>{offer.name}</td>
                          <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid #f0f2f4" }}>{offer.redemptions}</td>
                          <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid #f0f2f4" }}>{formatMoney(offer.discountAmount)}</td>
                          <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid #f0f2f4" }}>{formatMoney(offer.orderValue)}</td>
                          <td style={{ padding: "0.75rem 0.5rem", borderBottom: "1px solid #f0f2f4" }}>{formatMoney(offer.avgOrderValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Text as="p" tone="subdued">No offer performance data for this period.</Text>
              )}
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <Card>
      <div style={{ padding: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Badge tone="info">{label}</Badge>
          <span style={{ color: accent }}>
            <Text as="p" variant="headingLg" fontWeight="semibold">
              {value}
            </Text>
          </span>
        </div>
      </div>
    </Card>
  );
}