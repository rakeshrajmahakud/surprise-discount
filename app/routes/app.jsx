import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={en}>
        <s-app-nav>
          <s-link href="/app">Home</s-link>
          <s-link href="/app/offers">Offers</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
          <s-link href="/app/settings">Settings</s-link>
        </s-app-nav>
        <div style={{ padding: "0 1.5rem 1.5rem" }}>
          <Outlet />
        </div>
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
