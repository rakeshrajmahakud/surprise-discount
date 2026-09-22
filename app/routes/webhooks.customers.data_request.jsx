import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  // The app does not store customer records or customer-identifying fields.
  console.log(`Received ${topic} webhook for ${shop}; no customer data is stored.`);
  return new Response();
};