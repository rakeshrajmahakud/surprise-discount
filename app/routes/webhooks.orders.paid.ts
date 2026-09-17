import { authenticate } from "../shopify.server";
import { recordOrderRedemption } from "../analytics.server";

export const action = async ({ request }: { request: Request }) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (shop && payload) {
    await recordOrderRedemption(shop, payload);
  }

  return new Response(null, { status: 200 });
};
